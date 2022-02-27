#!/bin/bash
export ARCHIVE="obsidian-$(jq -r '.version' package.json).chrome.zip"
npm run build-icons
npm run build
cd dist/
zip -r ../$ARCHIVE ./
