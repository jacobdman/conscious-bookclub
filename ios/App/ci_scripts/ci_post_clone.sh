#!/bin/sh
# Xcode Cloud: Capacitor iOS resolves Swift packages from node_modules (see CapApp-SPM/Package.swift).
# Without this step, xcodebuild fails with "The folder … doesn't exist" for @capacitor/* paths.
set -e

ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"
cd "$ROOT"

echo "ci_post_clone: repository root=$ROOT"

if ! command -v npm >/dev/null 2>&1; then
  echo "ci_post_clone: npm not found. Install Node in your Xcode Cloud workflow or custom environment." >&2
  exit 1
fi

echo "ci_post_clone: npm ci"
npm ci

echo "ci_post_clone: web build + cap sync ios"
npm run cap:build

echo "ci_post_clone: done"
