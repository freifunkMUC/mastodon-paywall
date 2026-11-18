#!/usr/bin/env bash
# Prints the base image of the Dockerfile (the first FROM; the later stages
# build on it) as key=value lines:
#   base_name=<image, without digest>
#   base_digest=<its digest>
# The publish and the daily rebuild put them into the image labels. Fails if
# the image is not pinned by digest.
#   base-image.sh [Dockerfile]
set -euo pipefail

dockerfile=${1:-Dockerfile}
ref=$(awk 'toupper($1) == "FROM" { for (i = 2; i <= NF; i++) if ($i !~ /^--/) { print $i; exit } }' "$dockerfile")
case "$ref" in
  *@sha256:*) ;;
  *) echo "First FROM of $dockerfile is not pinned by digest: ${ref:-none}" >&2; exit 1 ;;
esac
echo "base_name=${ref%@*}"
echo "base_digest=${ref##*@}"
