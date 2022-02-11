# Obsidian Web: Connect your browser with your Obsidian notes

This is an unofficial Chrome extension for Obsidian that lets you send content from the web to your notes in Obsidian.

Do you find yourself on a webpage somewhere and want to add it to your notes so you can remember it later?  You can use Obsidian Web for sending any web content from Chrome to your Obsidian Notes easily by just clicking on a button in your toolbar.


## Prerequisites

* [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
  * Note: Supports use only with the default port (27124).

## Quickstart

1. Install [this Chrome Extension](https://chrome.google.com/webstore/detail/obsidian-web/edoacekkjanmingkbkgjndndibhkegad) from the Chrome Web Store.
2. Install and enable [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) from the Obsidian Community Plugins settings in Obsidian.
3. Click on the "Obsidian Web" icon in your toolbar and follow the displayed instructions.

Now you should be able to click on the icon in your toolbar to submit the page you're on to Obsidian:

![popup](http://coddingtonbear-public.s3.amazonaws.com/github/obsidian-web/popup.png)

## Options

Options can be accessed by right-clicking on the icon in your toolbar and pressing  "Options".

![options](http://coddingtonbear-public.s3.amazonaws.com/github/obsidian-web/options.png)

## Development

```
npm i
npm run dev
```

Then: load your "unpacked extension" from [Chrome Extensions](chrome://extensions/) by pointing Chrome at the `dist` folder.  Afterward, you will receive some instructions whenyou click on the "Obsidian Web" icon in your toolbar.
