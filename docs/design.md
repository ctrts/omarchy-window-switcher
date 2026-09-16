# Design and privacy

## Runtime design

`manifest.json` declares one overlay with `keepLoaded: true`. This behavior
keeps window and workspace MRU order in memory for the current shell session.

The plugin uses one keyboard-exclusive layer surface on the focused monitor.
It can list windows from other monitors without another focus owner.

When the switcher opens, `Switcher.qml` refreshes Hyprland toplevel and monitor
data. It owns the lifecycle, MRU state, input, and window activation.

The plugin records each focused-workspace event. It freezes the workspace order
when the switcher opens. Thus, cards do not move during keyboard or pointer
selection.

Numbered-workspace aliases belong to the switcher rather than the compositor.
The host persists them in the plugin's `shell.json` entry after the overlay
closes, avoiding a plugin reload in the middle of inline editing.

After a shell reload, the plugin uses window MRU to fill missing workspace
history. Focus events replace this estimate as the user changes workspaces.

The plugin uses QML and JavaScript, plus `hypr/layouts.lua`, which runs inside
Hyprland rather than in the shell. It does not start helper processes or
construct shell commands from window metadata or invocation payloads.

The layout strip is the one place the switcher changes the compositor rather
than focus. `model/Layouts.js` builds a single `Hyprland.dispatch()` request.
Hyprland evaluates a dispatch as `hl.dispatch(<request>)`, which accepts a
function, so the request is `function() dofile(<module>).apply(...) end`.
Every value in it is a validated workspace selector and id, a catalog layout
id, or the plugin's own file path; nothing comes from a window title or a
payload. The module sets a workspace rule, registers the arrangement layouts
once per Hyprland Lua state, and saves the rule to Omarchy's
`workspace-layouts` state file.

## Component map

- `model/` contains the deterministic configuration, filter, layout, navigation,
  entry-matching, and MRU logic.
- `model/WindowSnapshot.js` keeps capture delegates for title-only changes. It
  refreshes records when other tracked data changes.
- `components/WindowRecords.qml` builds window records from compositor data.
- `components/CompositorSignals.qml` handles compositor events.
- `components/SwitcherHeader.qml` contains the search header, workspace pills,
  and view control.
- `components/SwitcherViewArea.qml` hosts the window, grouped, and workspace
  views.
- `components/SwitcherKeySurface.qml` owns the keyboard controls.
- `components/WindowCard.qml` creates a capture only for a scheduled window.
- `components/WorkspaceCard.qml` places window captures at their reported
  workspace geometry. Each miniature is a pointer target for its own window.
- `model/Layouts.js` holds the layout catalog, the schematic preview geometry,
  and the dispatch request builder. `hypr/layouts.lua` is its Hyprland side.
- `components/LayoutStrip.qml` and `components/LayoutThumb.qml` draw the
  layout picker for the selected workspace card.
- `components/KeyCap.qml` and `components/KeyHint.qml` draw the key legends
  that the footer and the workspace pills share.
- The root capture ramp waits for refreshed compositor geometry and then
  attaches capture sources in small batches instead of one blocking frame.

If workspace geometry is not available, the workspace card uses an even tile
layout. Minimized windows do not appear in a workspace preview.

## Invariants worth keeping

These are load-bearing and cheap to break by accident.

**Compositor signals are gated on the overlay being visible.** `keepLoaded`
means this plugin outlives every summon, so an ungated signal costs CPU for
the whole session. Only the window set and the focused window stay live while
hidden — together they keep MRU order correct for the next summon. Anything
that merely describes how the overlay would *look* waits until it is shown.

**`searchBase` must stay out of `RECORD_FIELDS`.** Records carry a prebuilt
lowercase search haystack so the filter does not rebuild one per record per
keystroke. It contains the title, so listing it as a tracked snapshot field
would make every title change invalidate the snapshot — silently undoing the
capture-delegate preservation `WindowSnapshot` exists for. For the same
reason the workspace alias is *not* baked into it: an alias is edited live,
so it is appended at query time instead.

**The selected border is an overlay, not a wider border.** `contentInset`
follows `surface.border.width`, and a card anchors its preview to that inset.
Widening the real border on selection therefore resizes the preview, changes
`ScreencopyView.constraintSize`, and reallocates a capture buffer on both the
newly and previously selected card at every Tab press.

**Anything that rebuilds the delegate set must restart the capture ramp.**
Switching views destroys every delegate and builds the other view's set from
nothing. Without restarting the ramp they all attach screencopy sources in a
single frame, which is the allocation stall the ramp exists to prevent.

**A master orientation change passes through dwindle on a later tick.**
Hyprland rebuilds a workspace's layout only when the layout *name* changes, so
switching Main left to Main right updates the rule and moves nothing. Two rules
in the same Lua call collapse into one, so the module sets dwindle and applies
master from a one-shot `hl.timer`.

**Hyprland registers each arrangement once per Lua state.**
`hl.layout.register` rejects a duplicate name, and a config reload builds a
fresh state, which clears the registrations. The module keeps a global flag
that dies with the state, and a saved arrangement file registers the layouts
again before its rule.

**`tiledLayout` from IPC is not trusted for registered layouts.** Hyprland's
IPC reports one registered name for every Lua layout, and reports `master`
without its orientation. The strip marks the layout the switcher last applied
for as long as it agrees with the reported family.

## Visual hierarchy

The switcher shows many dense previews at the same time. These rules keep the
previews first and the controls second.

- The close button rests in neutral chrome. It shows the urgent color only
  under the pointer. A card shows its close button only when it is selected.
  The pointer selects the card that it touches, so the mouse can reach every
  close button.
- Selection uses four signals together: the other cards become dim, and the
  selected card grows, gets a thicker border, and gets an outer ring. No part
  of this is animated, because two cards must never look selected at once.
- An outlined chip is a key that the user can press. A filled chip is a count.
  The workspace pills and the footer legends use the same two shapes.
- A captured miniature keeps an application icon whenever it is large enough
  to carry one legibly. Many terminal windows look the same at preview size,
  and the capture alone is not sufficient to identify one.
- The workspace card names the window under the pointer in one band at the
  bottom of the preview. A miniature can be too small for a title.

## Privacy

The plugin does not persist or log previews or full window titles. It persists
only user-entered workspace aliases. It does not send this data over the
network or write preview images to disk.

The local `status()` method returns the selected title and address for
diagnostics.

## Validation

Run the automated tests from the repository root:

```bash
./test/all
```

The script runs Node model tests, contract tests, manifest validation, and
`qmllint` against the active Omarchy shell import path.

For release validation, install the plugin in a disposable Omarchy VM. Exercise
native Wayland, XWayland, Electron, modal, fullscreen, minimized, and special
workspace windows.

Exercise preview failure and mixed-scale multi-monitor layouts. Inspect
screenshots and a short recording for clipping, overlap, stale previews,
selection, focus, and animation errors.
