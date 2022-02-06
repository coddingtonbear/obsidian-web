# Obsidian Web: Connect your browser with your Obsidian notes

*Note: This is a work-in-progress!*  This does currently work, but it's not polished enough for me to release to the Chrome Extension Store yet.  See "Development" below for how you might use this extension before release.

## Prerequisites

* [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
  * Note: Supports use only with the default port (27124).

## Development

```
npm i
npm run dev
```

Then: load your "unpacked extension" from [Chrome Extensions](chrome://extensions/) by pointing Chrome at the `dist` folder.
