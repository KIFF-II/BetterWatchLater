# Changelog

All notable changes to Better Watch Later are listed here, newest first.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Extension icon: a clock with a tick, in `icons/`. The SVG is the source; the PNGs are what browsers use.

## [0.1.1] - 2026-10-23

### Changed

- Removing a video with ✕ now feels instant. The row disappears as soon as you click, and YouTube is told in the background. Before, the row stayed until YouTube answered, which took about two seconds on a large Watch Later list.
- If YouTube refuses a removal, the video comes back and an error message explains why.
- Clicking Undo while a removal is still in progress now waits for the removal to finish before adding the video back, so the two can't arrive at YouTube in the wrong order.

## [0.1.0] - 2026-10-23

First release, submitted to addons.mozilla.org.

### Added

- ✕ button on every Watch Later video for one-click removal, with Undo.
- "Remove watched…" panel that scans the whole playlist, asks for confirmation and downloads a backup list before removing videos watched past a chosen percentage.
- "Shuffle loaded" to show the loaded videos in random order.
- Firefox data collection declaration (`none`), required by addons.mozilla.org.
- Link to the source code on the add-on's page.

[0.1.1]: https://github.com/KIFF-II/BetterWatchLater/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/KIFF-II/BetterWatchLater/releases/tag/v0.1.0
