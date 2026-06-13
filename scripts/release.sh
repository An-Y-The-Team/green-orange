#!/usr/bin/env bash
# Cut the next release tag and push it (triggers the GitHub Actions deploy).
#
# Usage:
#   scripts/release.sh fix       # 0.5.8 -> 0.5.9   (patch)
#   scripts/release.sh feat      # 0.5.8 -> 0.6.0   (minor, resets patch)
#   scripts/release.sh release   # 0.5.8 -> 1.0.0   (major, resets minor+patch)
#
# Flags:
#   -n, --dry-run   Print the new tag without creating or pushing it.
set -euo pipefail

bump="${1:-}"
dry_run=false
for arg in "$@"; do
  case "$arg" in
    -n|--dry-run) dry_run=true ;;
  esac
done

case "$bump" in
  fix|feat|release) ;;
  *)
    echo "Usage: $0 {fix|feat|release} [--dry-run]" >&2
    exit 1
    ;;
esac

# Latest semver tag of the form vX.Y.Z (across all branches), default v0.0.0.
git fetch --tags --quiet 2>/dev/null || true
latest="$(git tag --list 'v*' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1)"
latest="${latest:-v0.0.0}"

read -r major minor patch <<<"$(echo "${latest#v}" | tr '.' ' ')"

case "$bump" in
  fix)     patch=$((patch + 1)) ;;
  feat)    minor=$((minor + 1)); patch=0 ;;
  release) major=$((major + 1)); minor=0; patch=0 ;;
esac

next="v${major}.${minor}.${patch}"

echo "latest: $latest  ->  next: $next  ($bump)"

if $dry_run; then
  exit 0
fi

git tag "$next"
git push origin "$next"
echo "Pushed $next — deploy pipeline triggered."
