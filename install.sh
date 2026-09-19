#!/bin/bash
# Install this checkout as the ctr.window-switcher plugin.
#
# The reason this script exists: copying the files and rescanning is not
# enough. The manifest sets `keepLoaded: true`, so the overlay stays cached
# for the life of the shell and a rescan keeps running the QML that was
# loaded at startup. A shell that has been up for days will happily report
# the plugin as enabled, answer `summon` with "ok", and show nothing — which
# is exactly as confusing as it sounds. Only `omarchy restart shell` loads
# new QML, and it refuses while the screen is locked.
#
#   ./install.sh            install or reinstall, then restart the shell
#   ./install.sh --no-restart   copy and rescan only (the shell keeps the old QML)

set -euo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ID="ctr.window-switcher"
TARGET="$HOME/.config/omarchy/plugins/$ID"
RESTART=1
[[ "${1:-}" == "--no-restart" ]] && RESTART=0

step() { printf '\033[1;34m::\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

command -v omarchy >/dev/null || fail "the omarchy CLI is not on PATH"
[[ -f "$SOURCE/manifest.json" ]] || fail "run this from the repository checkout"

# Validate before touching the installed copy, so a broken checkout cannot
# replace a working plugin.
step "validating the checkout"
omarchy plugin validate "$SOURCE" || fail "the plugin manifest did not validate"

step "installing to $TARGET"
mkdir -p "$(dirname "$TARGET")"
rm -rf "$TARGET"
# The .git directory is 40x the size of the plugin and the shell never reads
# it; test/ and docs/ are equally dead weight in the plugins folder.
rsync -a --delete \
  --exclude '.git' --exclude '.github' --exclude 'test' --exclude 'docs' \
  --exclude 'preview.webp' --exclude '*.md' \
  "$SOURCE/" "$TARGET/"
printf '   %s files\n' "$(find "$TARGET" -type f | wc -l)"

step "registering with the shell"
omarchy-shell -q shell rescanPlugins >/dev/null 2>&1 || warn "rescan failed; the restart below covers it"
omarchy plugin enable "$ID" >/dev/null 2>&1 || true

if (( RESTART )); then
  # Restarting while locked is refused, and asking first is cheaper than
  # discovering it from an error.
  if omarchy-shell lock status 2>/dev/null | grep -q '"locked":true'; then
    warn "the screen is locked — the shell cannot restart now."
    warn "unlock, then run: omarchy restart shell"
  else
    step "restarting the shell so the new QML actually loads"
    omarchy restart shell
    sleep 2
  fi
else
  warn "skipped the restart: the running shell keeps the QML it started with."
fi

step "verifying"
if omarchy-shell shell listPlugins 2>/dev/null | grep -q "\"id\":\"$ID\""; then
  printf '   the shell reports %s\n' "$ID"
else
  warn "the shell does not list $ID yet — try: omarchy restart shell"
fi

cat <<EOF

Bind it, if you have not already, in ~/.config/hypr/bindings.lua:

  o.bind("CTRL + TAB", "Window switcher", "omarchy-shell shell toggle $ID")

Then: hyprctl reload && hyprctl configerrors
EOF
