export ARCHIVE="obsidian-$(jq -r '.version' package.json).zip"
npm run build
cp -rf dist dist.firefox
cp firefox/manifest.json dist.firefox/manifest.json
npm run web-ext -- build --source-dir=./dist.firefox --artifacts-dir=./
