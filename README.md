# Better Watch Later

A small Chrome and Firefox extension that makes YouTube's Watch Later page easier to manage.

## Why it exists

I have 4,900 to 5,000 videos on my Watch Later list on YouTube at all times. I want to manage it well, but YouTube's default UI was missing features I wanted. The worst part is that "Remove from Watch Later" is hidden behind a three-dot menu on every single video. We've been meaning to build this extension for many years, but never got round to it. 

Now it exists and we use it every day. That's Good!

## Features

- **One-click remove.** Every video gets a ✕ button. Click it and the video is gone, with an Undo button in case you slip.
- **Remove watched videos.** Scans the whole playlist (not just what's loaded on screen), finds videos you've watched past a percentage you choose (default 90%), shows you what it found and asks before removing anything. It downloads a backup list of those videos first, so nothing is lost for good.
- **Shuffle.** Shows the loaded videos in random order. This only changes what you see; reload to get YouTube's order back.

All of this only appears on the Watch Later page (`youtube.com/playlist?list=WL`).

## Install

**Chrome, Edge, Brave:** open `chrome://extensions`, turn on Developer mode, click "Load unpacked" and pick this folder.

**Firefox (128 or newer):** open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on" and pick `manifest.json`. Temporary add-ons disappear when Firefox restarts. To keep it installed, sign it (free, unlisted) at [addons.mozilla.org](https://addons.mozilla.org/developers/). If nothing shows up on YouTube, check the extension's Permissions tab in `about:addons` and allow youtube.com.

## How it works

- `src/api.js` calls the same internal YouTube endpoints the website itself uses when you remove a video from the three-dot menu.
- `src/content.js` adds the buttons and the panel, and keeps up with YouTube's page changes.
- `src/styles.css` uses YouTube's own colours, so it follows light and dark mode.
- `icons/icon.svg` is the icon's source. Chrome can't use SVG icons, so the manifest points at PNG copies in `icons/`. If you change the SVG, export it again at 16, 32, 48, 96 and 128 pixels with the same file names.

These endpoints are not an official, documented API. If YouTube changes them, removing videos may stop working until the extension is updated. When that happens you'll see an error message; it won't remove anything silently.

## Release management

Releases are made by GitHub Actions (`.github/workflows/release.yml`) whenever a version tag is pushed.

To make a release:

1. Add an entry for the new version at the top of `CHANGELOG.md`, with a heading like `## [0.1.2] - 2026-11-01`.
2. Change `"version"` in `manifest.json` to the same number.
3. Commit, then tag and push:

   ```
   git tag -a v0.1.2 -m "Better Watch Later 0.1.2"
   git push origin main v0.1.2
   ```

GitHub then creates a release titled "Better Watch Later 0.1.2", uses that version's changelog entry as the release notes, and attaches `better-watch-later-0.1.2.zip`, ready to upload to addons.mozilla.org. The zip only holds `manifest.json`, `src/`, `icons/` and `LICENSE.md`.

The release stops with an error in the Actions tab if `CHANGELOG.md` has no entry for the version, or if the `manifest.json` version doesn't match the tag.

To make a release for a tag that already exists, go to **Actions → Release → Run workflow**, keep the branch on `main` and enter the tag (for example `v0.1.1`).

To preview the release notes on your own machine, run `.github/scripts/changelog-section.sh 0.1.2`.

## Built with AI

This extension was written by **Claude Opus 5.5**, an AI model made by [Anthropic](https://www.anthropic.com), working through **Claude Code**. We described the problem and the features we wanted, along with screenshots of the Watch Later page. Claude wrote the code and tested it against a mocked copy of the page. We edited the extension for suitability and tested it against the live YouTube API.

## License

[GNU General Public License v3.0](LICENSE.md).
