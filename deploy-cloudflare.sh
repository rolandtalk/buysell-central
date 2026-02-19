#!/bin/sh
# Deploy static site + API proxy to Cloudflare Pages (Direct Upload).
# Prereq: npx wrangler login (once)
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
DEPLOY_DIR=".pages-deploy"
mkdir -p "$DEPLOY_DIR"
cp index.html app.js styles.css symbols.json "$DEPLOY_DIR"
cp -r functions "$DEPLOY_DIR"/
npx wrangler pages deploy "$DEPLOY_DIR" --project-name=buysell-central
