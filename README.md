# Better Watch Later

A small Chrome and Firefox extension that makes YouTube's Watch Later page easier to manage.

## Why it exists

I have 4,900 to 5,000 videos on my Watch Later list on YouTube at all times. I want to manage it well, but YouTube's default UI was missing features I wanted. The worst part is that "Remove from Watch Later" is hidden behind a three-dot menu on every single video. So I prompted an AI to build this.

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

These endpoints are not an official, documented API. If YouTube changes them, removing videos may stop working until the extension is updated. When that happens you'll see an error message; it won't remove anything silently.

## Built with AI

This extension was written by **Claude**, an AI model made by [Anthropic](https://www.anthropic.com), working through **Claude Code**, Anthropic's coding tool. I described the problem and the features I wanted, along with screenshots of the Watch Later page. Claude wrote the code and tested it against a mocked copy of the page. Claude could not sign in to YouTube, so testing against the real site is done by hand.

## License

[GNU General Public License v3.0](LICENSE.md).
