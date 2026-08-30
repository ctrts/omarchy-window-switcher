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

The plugin uses QML and JavaScript only. It does not start helper processes or
construct shell commands from window metadata or invocation payloads.

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
  workspace geometry.
- The root capture ramp waits for refreshed compositor geometry and then
  attaches capture sources in small batches instead of one blocking frame.

If workspace geometry is not available, the workspace card uses an even tile
layout. Minimized windows do not appear in a workspace preview.

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
