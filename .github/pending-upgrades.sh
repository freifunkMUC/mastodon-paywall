#!/usr/bin/env bash
# Prints the number of pending Debian package upgrades in an image (a fresh
# "apt-get update" inside it). A failing "apt-get update" or "docker run" fails
# the script rather than look like "nothing pending".
#   pending-upgrades.sh <image>
set -euo pipefail

upgrade=$(docker run --rm --platform linux/amd64 --user 0 --entrypoint bash "$1" \
  -c 'apt-get -qq --error-on=any update >/dev/null && apt-get -s upgrade')
grep -c '^Inst ' <<< "$upgrade" || true
