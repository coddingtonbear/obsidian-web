#!/bin/bash
export ARCHIVE="obsidian-$(jq -r '.version' package.json).zip"
cd dist/
zip ../$ARCHIVE *
