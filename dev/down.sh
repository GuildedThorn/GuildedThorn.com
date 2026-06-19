#!/usr/bin/env bash
# Tear down the GuildedThorn dev environment containers.
set -euo pipefail

if command -v podman >/dev/null 2>&1; then ENGINE=podman; else ENGINE=docker; fi
$ENGINE rm -f gt-dev-mongo gt-dev-rabbit >/dev/null 2>&1 || true
echo "Removed gt-dev-mongo and gt-dev-rabbit ($ENGINE)"
