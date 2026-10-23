// Talks to YouTube's internal "InnerTube" API, which is what youtube.com itself
// calls when you click "Remove from Watch Later" in the three-dot menu.
//
// This file runs in the page's MAIN world (see manifest.json) so it can read
// window.ytcfg, where YouTube keeps the client info every request needs.

const WatchLaterApi = (() => {
  const PLAYLIST_ID = "WL";

  function config(key) {
    return window.ytcfg?.get?.(key) ?? window.ytcfg?.data_?.[key];
  }

  function readCookie(name) {
    const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function sha1Hex(text) {
    const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // YouTube checks a request belongs to your signed-in session by asking for a
  // hash of "timestamp + secret cookie + origin". The website builds the same
  // header; we are just doing it ourselves.
  async function buildAuthHeader() {
    const timestamp = Math.floor(Date.now() / 1000);
    const schemes = [
      ["SAPISIDHASH", readCookie("SAPISID") ?? readCookie("__Secure-3PAPISID")],
      ["SAPISID1PHASH", readCookie("__Secure-1PAPISID")],
      ["SAPISID3PHASH", readCookie("__Secure-3PAPISID")],
    ];

    const parts = [];
    for (const [scheme, secret] of schemes) {
      if (!secret) continue;
      const hash = await sha1Hex(`${timestamp} ${secret} ${location.origin}`);
      parts.push(`${scheme} ${timestamp}_${hash}`);
    }

    if (parts.length === 0) throw new Error("You don't seem to be signed in to YouTube.");
    return parts.join(" ");
  }

  async function post(endpoint, body) {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": await buildAuthHeader(),
      "X-Origin": location.origin,
      "X-Goog-AuthUser": String(config("SESSION_INDEX") ?? 0),
      "X-Goog-Visitor-Id": config("VISITOR_DATA") ?? "",
      "X-Youtube-Client-Name": String(config("INNERTUBE_CONTEXT_CLIENT_NAME") ?? 1),
      "X-Youtube-Client-Version": config("INNERTUBE_CONTEXT_CLIENT_VERSION") ?? "",
    };

    // Set when you're using a Brand Account rather than your personal channel.
    const delegatedSession = config("DELEGATED_SESSION_ID");
    if (delegatedSession) headers["X-Goog-PageId"] = delegatedSession;

    const response = await fetch(`/youtubei/v1/${endpoint}?prettyPrint=false`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ context: config("INNERTUBE_CONTEXT"), ...body }),
    });

    if (!response.ok) throw new Error(`YouTube answered ${response.status} to ${endpoint}.`);
    return response.json();
  }

  async function editWatchLater(actions) {
    const result = await post("browse/edit_playlist", { playlistId: PLAYLIST_ID, actions });
    if (result.status !== "STATUS_SUCCEEDED") {
      throw new Error("YouTube didn't confirm the change.");
    }
  }

  function removeVideos(videoIds) {
    return editWatchLater(videoIds.map(id => ({
      action: "ACTION_REMOVE_VIDEO_BY_VIDEO_ID",
      removedVideoId: id,
    })));
  }

  function addVideos(videoIds) {
    return editWatchLater(videoIds.map(id => ({
      action: "ACTION_ADD_VIDEO",
      addedVideoId: id,
    })));
  }

  // Visits every property in a JSON tree. If visit() returns true for a
  // property, we don't look inside it.
  //
  // YouTube's response shapes move around a lot, so rather than hard-coding
  // "contents.twoColumnBrowseResultsRenderer.tabs[0]..." we just look for the
  // pieces we care about wherever they are.
  function walk(node, visit) {
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      const handled = visit(key, value);
      if (!handled) walk(value, visit);
    }
  }

  function toVideo(renderer) {
    let percentWatched = 0;
    walk(renderer, (key, value) => {
      if (key === "percentDurationWatched") percentWatched = value;
    });

    return {
      videoId: renderer.videoId,
      title: renderer.title?.runs?.[0]?.text ?? renderer.title?.simpleText ?? "(untitled)",
      percentWatched,
    };
  }

  // The whole playlist, not just what's scrolled into view. YouTube hands it
  // out ~100 videos at a time, with a "continuation" token for the next page.
  async function fetchAllVideos(onProgress) {
    const videos = [];
    const seenTokens = new Set();
    let page = await post("browse", { browseId: "VL" + PLAYLIST_ID });

    while (page) {
      let nextToken = null;

      walk(page, (key, value) => {
        if (key === "playlistVideoRenderer") {
          videos.push(toVideo(value));
          return true;
        }
        if (key === "continuationCommand") {
          nextToken = value.token;
          return true;
        }
        return false;
      });

      onProgress?.(videos.length);

      // Guard against looping forever if YouTube hands back a token we've used.
      if (!nextToken || seenTokens.has(nextToken)) break;
      seenTokens.add(nextToken);
      page = await post("browse", { continuation: nextToken });
    }

    return videos;
  }

  return { removeVideos, addVideos, fetchAllVideos };
})();
