# Changelog

This fork starts from upstream
[devmobasa/omarchy-window-switcher](https://github.com/devmobasa/omarchy-window-switcher)
at `93d286a` ("polish workspace switching and controls").

## Unreleased — fork

Nothing below has been exercised on real hardware yet; every claim here is
backed by the test suite and static analysis only.

### Layouts

- **The workspace view has a layout strip.** It shows ten layouts for the
  selected workspace card, drawn with that workspace's window count: Hyprland's
  Dwindle, Scrolling, Monocle and Main left/right/top/center, plus Columns,
  Rows and Grid arrangements. Click one or press Alt+1 … Alt+0.
- A **Fullscreen** choice (Alt+F) toggles Hyprland fullscreen for the
  workspace's most recent window. It is not saved.
- Arrangements are registered with Hyprland's Lua layout API
  (`hypr/layouts.lua`), so they keep their shape as windows open and close.
- The choice is saved to Omarchy's `workspace-layouts` state file, shared with
  SUPER+L, and survives a Hyprland reload.
- Verified live on Hyprland 0.56.2 against real windows: every layout
  rearranges, a master orientation change takes effect, and a saved grid
  survives `hyprctl reload` and places a newly opened window. The strip UI
  itself passes lint and the contract tests but has not been exercised on
  screen yet.

### Identity

- Plugin id is now `ctr.window-switcher` (was `community.window-switcher`),
  matching the `ctr.*` namespace used by the other plugins on this machine.
- `LICENSE` is untouched: MIT requires the original copyright notice to be
  retained, so upstream keeps its line and the fork is credited in the README.

### Correctness

- **The model no longer rebuilds continuously while the switcher is closed.**
  The manifest sets `keepLoaded: true`, so the plugin lives for the whole shell
  session, but `refreshRequested()` fired from five ungated sources. A terminal
  repainting its title drove a debounced full record rebuild forever behind a
  hidden overlay. Exactly two sources stay live now — the window set and the
  focused window — because together they keep MRU order correct for the next
  summon. Everything else only describes how the overlay would look, and waits
  until it is on screen.
- **Card widths no longer fall below the readable minimum.** `Metrics.js`
  derived its column count assuming N columns carry N-1 gaps, then computed
  card width by subtracting a *whole* gap from every cell — one gap too many.
  At 1200px with a 160px minimum that produced a 159px card, and the scrolling
  fallback that exists precisely to hold the floor recomputed the same 159.

- **Workspace cards now draw windows where they really are.** Records read
  the window position with `Array.isArray(ipc.at)`, but Hyprland IPC pairs
  arrive as Qt sequences, which that check rejects. Every rect was null, so
  every card used the even-tile fallback — and a layout change could never
  show on its card.
- **The selected card keeps all four borders.** It is drawn 4% larger with an
  outer ring, but cards were sized to the full view height, which clips. A lone
  tall workspace card lost its top and bottom borders; fitted grids now size
  against the height left once that growth is set aside.
- **Workspace cards take the monitor's shape.** Cards were sized for 16:9, so
  on a 16:10 screen the workspace canvas sat between empty side bands. Cards
  now use the aspect ratio of the monitor their windows are on.

### Performance

- **Selection no longer reallocates capture buffers.** The selected border was
  widened on the card surface itself, and `contentInset` follows that border
  width, so selecting a card resized its preview — which changed
  `ScreencopyView.constraintSize` and forced a buffer reallocation on both the
  newly *and* previously selected card, on every Tab press. The selected border
  is now painted as a constant-width overlay.
- **Switching views no longer allocates every screencopy context in one frame.**
  Ctrl+W / Ctrl+G destroys every delegate and builds the other view from
  nothing, with the capture ramp already finished — so the whole new set
  attached at once, the exact stall the ramp exists to spread out.
  `setViewMode()` now restarts the ramp.
- **Cards no longer build a close button they never show.** The shared frame's
  `Loader` was visible-gated but always active, so a 40-window grid built 40
  `CloseButton`s (each a Rectangle + Timer + MouseArea + Text) to show one.
- **Desktop-entry matching is memoized per rebuild.** Matching normalizes every
  installed entry with two regex passes, so it cost windows × installed
  applications every rebuild. Windows of one application share an answer, and a
  session runs far fewer applications than it has windows.
- **Search haystacks are built once per record, not per keystroke.** Filtering
  re-joined and re-lowercased six fields for every record across two or three
  passes per keystroke. The record-intrinsic part is now cached on the record.
  The workspace alias is deliberately *not* cached — it is the one searchable
  field a user edits in place — so it is appended at query time.
  `searchBase` is intentionally absent from `WindowSnapshot.RECORD_FIELDS`:
  it contains the title, and listing it would make every title change
  invalidate the snapshot, silently undoing the delegate preservation that
  module exists for.
- Query terms are split once per filter pass instead of once per record.

### Tooling

- **The QML lint gate was vacuous and is now real.** `test/all` called
  `qmllint` unqualified, but Arch ships it in `/usr/lib/qt6/bin`, so the
  suite died on `command not found` before linting. It also passed the shell
  root as the import path, but Qt resolves `qs.X` to `<import path>/qs/X`, so
  every `qs.*` import failed, type checking silently disabled itself, and the
  gate proved nothing. The script now locates the binary and builds a
  temporary `qs/` symlink tree.
- With imports actually resolving, ~320 `unqualified` warnings surfaced —
  nested delegates capturing outer ids, the classic QML lifetime footgun.
  `pragma ComponentBehavior: Bound` was added to the seven affected
  components. The tree now lints clean.
- Regression tests added for the metrics gap accounting and the cached search
  haystack, and contract assertions added for the compositor-signal gating and
  the `searchBase` / `RECORD_FIELDS` invariant.

## Known gaps

Carried over from upstream and not yet addressed:

- Vertical grid navigation is not reversible. Clamping a move into a short last
  row changes column, so Down-then-Up does not return to the starting index
  (5 items across 3 columns: 2 → Down → 4 → Up → 1). A proper fix needs a
  sticky desired-column, which changes the navigation signature.
- Workspace cards build a full miniature delegate per window regardless of the
  capture budget; only the capture source is gated.
- `WorkspaceGridView` re-slices its window array on any model change, which
  defeats `WindowSnapshot` delegate preservation for the default view.
- No accessibility semantics anywhere: no `Accessible.*` properties, and the
  search field is a Rectangle imitating a text input, so a screen reader
  announces nothing.
- `animationMs` is threaded through every view and card and never read; the
  animations hardcode their durations.
- `ViewToggle` and `WorkspaceOrderToggle` are structurally identical and should
  be one component.
