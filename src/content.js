// Adds the Watch Later UI: a remove button on every row, plus a small panel
// with "Remove watched" and "Shuffle".
//
// YouTube is a single page app, so we never get a fresh page load when you
// navigate. Instead we watch the DOM and re-check whenever it changes.
//
// Note: YouTube blocks innerHTML (Trusted Types), so all elements here are
// built with createElement + textContent.

(() => {
  const ROW_SELECTOR = "ytd-browse:not([hidden]) ytd-playlist-video-renderer";
  const REMOVE_BATCH_SIZE = 50;
  const THRESHOLD_STORAGE_KEY = "watchLaterTools.watchedThreshold";

  let panel = null;
  let statusLine = null;
  let toastTimer = null;

  // ---------- Small helpers ----------

  function isWatchLaterPage() {
    return location.pathname === "/playlist"
      && new URLSearchParams(location.search).get("list") === "WL";
  }

  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function videoIdOf(row) {
    const link = row.querySelector("a#thumbnail, a#video-title");
    if (!link?.href) return null;
    return new URL(link.href).searchParams.get("v");
  }

  function titleOf(row) {
    return row.querySelector("#video-title")?.textContent.trim() || "Video";
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------- Toasts ----------

  function showToast(message, action) {
    document.querySelector(".wlt-toast")?.remove();
    clearTimeout(toastTimer);

    const toast = element("div", "wlt-toast", message);
    if (action) {
      const button = element("button", "wlt-toast-action", action.label);
      button.addEventListener("click", () => {
        toast.remove();
        action.run();
      });
      toast.append(button);
    }

    document.body.append(toast);
    toastTimer = setTimeout(() => toast.remove(), 7000);
  }

  // ---------- Removing a single video ----------

  // We hide rows rather than deleting them, because YouTube owns those
  // elements and may reuse them. We remember which video we hid so we can
  // un-hide the row if YouTube recycles it for a different video.
  function hideRow(row, videoId) {
    row.classList.add("wlt-removed");
    row.dataset.wltRemovedId = videoId;
  }

  function unhideRow(row) {
    row.classList.remove("wlt-removed");
    delete row.dataset.wltRemovedId;
  }

  async function removeRow(row, button) {
    const videoId = videoIdOf(row);
    if (!videoId) return showToast("Couldn't work out which video this is.");

    const title = titleOf(row);
    button.disabled = true;

    try {
      await WatchLaterApi.removeVideos([videoId]);
      hideRow(row, videoId);
      showToast(`Removed "${title}"`, {
        label: "Undo",
        run: () => undoRemove(row, videoId, title),
      });
    } catch (error) {
      showToast(`Couldn't remove: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  }

  async function undoRemove(row, videoId, title) {
    try {
      await WatchLaterApi.addVideos([videoId]);
      unhideRow(row);
      // YouTube treats this as a fresh add, so after a reload it'll be at the top.
      showToast(`Put "${title}" back`);
    } catch (error) {
      showToast(`Couldn't undo: ${error.message}`);
    }
  }

  function decorateRow(row) {
    // Row was hidden, but YouTube has since reused it for another video.
    if (row.dataset.wltRemovedId && row.dataset.wltRemovedId !== videoIdOf(row)) {
      unhideRow(row);
    }

    if (row.querySelector(".wlt-remove-button")) return;

    const button = element("button", "wlt-remove-button", "✕");
    button.title = "Remove from Watch Later";
    button.addEventListener("click", event => {
      // Stop the click from reaching YouTube and opening the video.
      event.preventDefault();
      event.stopPropagation();
      removeRow(row, button);
    });

    const menu = row.querySelector("#menu");
    if (menu) menu.before(button);
    else row.append(button);
  }

  // ---------- Bulk: remove watched videos ----------

  function readThreshold() {
    try {
      const saved = Number(localStorage.getItem(THRESHOLD_STORAGE_KEY));
      return saved > 0 && saved <= 100 ? saved : 90;
    } catch {
      return 90;
    }
  }

  function saveThreshold(value) {
    try {
      localStorage.setItem(THRESHOLD_STORAGE_KEY, String(value));
    } catch {
      // Not important enough to bother the user about.
    }
  }

  // Before a bulk removal we save the list to a file, so nothing is ever
  // truly lost: you can always see what was removed and re-add it.
  function downloadBackup(videos) {
    const lines = videos.map(v => `https://www.youtube.com/watch?v=${v.videoId}\t${v.title}`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const link = element("a");
    link.href = URL.createObjectURL(blob);
    link.download = `watch-later-removed-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  }

  async function removeWatched(threshold, button) {
    button.disabled = true;

    try {
      statusLine.textContent = "Scanning your Watch Later…";
      const all = await WatchLaterApi.fetchAllVideos(count => {
        statusLine.textContent = `Scanning… ${count} videos`;
      });

      const watched = all.filter(v => v.percentWatched >= threshold);
      if (watched.length === 0) {
        statusLine.textContent = `Checked ${all.length} videos. None are ${threshold}%+ watched.`;
        return;
      }

      const preview = watched.slice(0, 5).map(v => `  • ${v.title}`).join("\n");
      const more = watched.length > 5 ? `\n  …and ${watched.length - 5} more` : "";
      const confirmed = confirm(
        `Remove ${watched.length} of ${all.length} videos that are at least ${threshold}% watched?\n\n`
        + `${preview}${more}\n\nA backup list will be downloaded first.`
      );
      if (!confirmed) {
        statusLine.textContent = "Cancelled. Nothing removed.";
        return;
      }

      downloadBackup(watched);

      let removed = 0;
      for (let i = 0; i < watched.length; i += REMOVE_BATCH_SIZE) {
        const batch = watched.slice(i, i + REMOVE_BATCH_SIZE);
        await WatchLaterApi.removeVideos(batch.map(v => v.videoId));
        removed += batch.length;
        statusLine.textContent = `Removed ${removed} / ${watched.length}…`;
        await sleep(300); // be polite, YouTube rate-limits bursts
      }

      const removedIds = new Set(watched.map(v => v.videoId));
      for (const row of document.querySelectorAll(ROW_SELECTOR)) {
        const id = videoIdOf(row);
        if (removedIds.has(id)) hideRow(row, id);
      }

      statusLine.textContent = `Done. Removed ${removed} watched videos.`;
    } catch (error) {
      statusLine.textContent = `Stopped: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  // ---------- Shuffle ----------

  // Only shuffles what's loaded on the page. The real order on YouTube is
  // untouched; reload to get it back.
  function shuffleLoadedRows() {
    const rows = [...document.querySelectorAll(ROW_SELECTOR)];
    if (rows.length < 2) return;

    // Fisher-Yates: walk backwards, swapping each item with a random earlier one.
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }

    // Keep YouTube's "load more" marker at the end so scrolling still works.
    const container = rows[0].parentElement;
    const loadMoreMarker = container.querySelector(":scope > ytd-continuation-item-renderer");
    for (const row of rows) container.insertBefore(row, loadMoreMarker);

    statusLine.textContent = `Shuffled ${rows.length} loaded videos. Reload to undo.`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- The floating panel ----------

  function buildPanel() {
    const root = element("div", "wlt-panel");
    root.append(element("div", "wlt-panel-title", "Better Watch Later"));

    const thresholdRow = element("label", "wlt-threshold");
    thresholdRow.append("Watched means ≥ ");
    const thresholdInput = element("input");
    thresholdInput.type = "number";
    thresholdInput.min = "1";
    thresholdInput.max = "100";
    thresholdInput.value = String(readThreshold());
    thresholdInput.addEventListener("change", () => saveThreshold(Number(thresholdInput.value)));
    thresholdRow.append(thresholdInput, "%");

    const removeWatchedButton = element("button", "wlt-panel-button", "Remove watched…");
    removeWatchedButton.addEventListener("click", () => {
      const threshold = Math.min(100, Math.max(1, Number(thresholdInput.value) || 90));
      removeWatched(threshold, removeWatchedButton);
    });

    const shuffleButton = element("button", "wlt-panel-button", "Shuffle loaded");
    shuffleButton.addEventListener("click", shuffleLoadedRows);

    statusLine = element("div", "wlt-status");

    root.append(thresholdRow, removeWatchedButton, shuffleButton, statusLine);
    return root;
  }

  // ---------- Keeping up with YouTube's page changes ----------

  function refresh() {
    if (!isWatchLaterPage()) {
      panel?.remove();
      return;
    }

    if (!panel) panel = buildPanel();
    if (!panel.isConnected) document.body.append(panel);

    document.querySelectorAll(ROW_SELECTOR).forEach(decorateRow);
  }

  // The DOM changes constantly on YouTube. Batch the checks to once per frame.
  let refreshQueued = false;
  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      refresh();
    });
  }

  new MutationObserver(queueRefresh).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("yt-navigate-finish", queueRefresh);
  queueRefresh();
})();
