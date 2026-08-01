# Configuration reference

Add configuration keys to the plugin entry in the `plugins` array of
`~/.config/omarchy/shell.json`.

This example shows all default values:

```json
{
  "id": "community.window-switcher",
  "defaultFilter": "all",
  "view": "workspaces",
  "workspaceOrder": "recent",
  "stickyFilter": false,
  "previewMode": "still",
  "showMinimized": true,
  "showSpecialWorkspaces": true,
  "maxInitialCaptures": 20,
  "animationMs": 140,
  "activation": "explicit"
}
```

## Configuration keys

| Key | Accepted values | Description |
|---|---|---|
| `defaultFilter` | `all`, `workspace`, or a workspace number | Selects the initial filter. `workspace` uses the focused workspace. |
| `view` | `workspaces`, `windows`, or `grouped` | Selects the initial view. `grouped` divides the window grid into workspace sections. |
| `workspaceOrder` | `recent` or `number` | Selects the order of workspace cards and grouped sections. |
| `stickyFilter` | `true` or `false` | Keeps the last selected workspace filter until the shell stops. |
| `previewMode` | `none`, `still`, or `liveSelected` | Controls capture. `liveSelected` streams only the selected window preview. |
| `showMinimized` | `true` or `false` | Sets the default visibility of compositor-minimized windows and windows on `special:minimized`. |
| `showSpecialWorkspaces` | `true` or `false` | Includes windows on Hyprland special workspaces. |
| `maxInitialCaptures` | 1 through 20 | Limits the number of initial window captures. |
| `animationMs` | 0 through 500 | Sets the animation duration in milliseconds. |
| `activation` | `explicit` or `release` | Selects Enter activation or experimental modifier-release activation. |

Unknown enum values use safe defaults. The plugin limits numbers to their
accepted ranges and limits a search query to 128 characters.

### View behavior

The workspace view shows one composite card for each occupied workspace. At
each opening, it selects the previous workspace.

The window view shows a flat MRU grid. The first Tab press selects the previous
window.

The grouped view divides the window grid into workspace sections.

The UI remembers a view change until the shell stops. A `view` value in an
invocation payload replaces the remembered value for that opening.

Recent order puts occupied regular workspaces in use order.
If the current workspace has a listed window, it appears first.
The previous listed workspace is selected. Number order sorts regular
workspaces by number.

Both orders put special workspaces after regular workspaces. The minimized
workspace comes after other special workspaces. Windows without a workspace
come last.

The workspace order does not change while the switcher is open. Use the
Recent and Number control or Ctrl+O to change the order.

The UI remembers an order change until the shell stops. A `workspaceOrder`
value in an invocation payload replaces the remembered value for that opening.

Recent history starts when the shell loads the plugin. After a reload, the
plugin fills missing history from window MRU. The history becomes exact as you
use workspaces.

### Filter behavior

By default, the switcher resets to `defaultFilter` each time it opens. Set
`stickyFilter` to `true` to remember the selected workspace filter.

Workspace pills are grouped under monitor labels in a multi-monitor layout.
In a single-monitor layout, the plugin does not show monitor labels.

Use the Minimized control or Ctrl+M to show or hide minimized windows. This
change applies to the current opening. The next opening uses `showMinimized`.
The control also applies to windows on `special:minimized`.

The Minimized control is at the top right of the header, to the left of the
Windows and Workspaces toggle. The control shows the accent color only when it
hides windows. If no window is minimized, the plugin does not show the control.

### Capture behavior

`maxInitialCaptures` limits initial captures in all views. A selected window can
use one capture outside this initial budget.

For workspace cards, the budget limits the window previews in display order.
The selected workspace has its own limit. Compositor-minimized windows do not
start capture contexts. Mapped windows on `special:minimized` can show previews.

In `liveSelected` mode, the selected window preview stays live. In the
workspace view, this is the most recent visible window on the selected card.

## Invocation payloads

Values in an invocation payload override stored configuration for one opening.
Use `filter`, not `defaultFilter`, in a payload.

Open with `direction: 1`:

```bash
omarchy shell shell summon community.window-switcher '{"direction":1}'
```

Open with the focused-workspace filter:

```bash
omarchy shell shell summon community.window-switcher '{"direction":1,"filter":"workspace"}'
```

The payload accepts each configuration key except `defaultFilter`. It also
accepts these keys:

| Key | Accepted values | Description |
|---|---|---|
| `filter` | `all`, `workspace`, or a workspace number | Replaces `defaultFilter` for this opening. |
| `direction` | `-1`, `0`, or `1` | Sets the initial selection or moves the selection in an open switcher. |
| `query` | A string | Starts with a search query of up to 128 characters. |

If the switcher is closed, `direction` sets the initial selection. In the
window and grouped views, `1` selects the previous most-recently-used (MRU)
window. `-1` selects the last window in the MRU list. `0` selects the active
window.

In the workspace view, `-1` and `1` select the previous listed workspace.
If the current workspace has a listed window, `0` selects it. The
`workspaceOrder` value changes the card position, but it does not change the
selected workspace.

If the switcher is open, another summon moves the current selection. `1` moves
forward, `-1` moves backward, and `0` keeps the current selection.

### Experimental modifier-release activation

Use this payload to request activation on release of Alt or Meta:

```bash
omarchy shell shell summon community.window-switcher '{"direction":1,"activation":"release"}'
```

The new layer surface can miss the original modifier release. This behavior
depends on compositor timing and the exact binding. Enter remains available.

Use `explicit` activation for the reliable baseline.

## Legacy compatibility

The plugin accepts these legacy keys:

- `defaultScope` in stored configuration and `scope` in payloads.
- `groupByWorkspace` in stored configuration or payloads.

The `all` and `monitor` scope values map to `all`. The `workspace` value maps
to the focused-workspace filter. `groupByWorkspace: true` maps to
`view: "grouped"`.

## Reload the configuration

The Omarchy shell watcher usually reloads `shell.json` after a manual edit. If
it does not reload, run this command:

```bash
omarchy shell shell reloadConfig
```
