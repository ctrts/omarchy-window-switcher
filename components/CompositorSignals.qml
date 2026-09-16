import QtQuick
import Quickshell
import Quickshell.Hyprland
import Quickshell.Wayland

// Compositor event wiring: which Hyprland and Wayland signals matter to the
// switcher and how urgently they invalidate its state.
Item {
  id: compositor

  required property bool switcherOpen

  signal refreshRequested()
  signal geometryRefreshRequested()
  signal activeWindowChanged()
  signal workspaceFocusChanged(var workspaceId)
  signal screenLayoutChanged()

  readonly property var geometryEventNames: [
    "openwindow", "closewindow", "movewindow", "movewindowv2", "minimize", "fullscreen",
    "workspace", "workspacev2", "focusedmon", "moveworkspace", "moveworkspacev2"
  ]
  readonly property var refreshEventNames: geometryEventNames.concat([
    "activewindow", "activewindowv2", "urgent"
  ])

  visible: false

  // The manifest keeps this plugin loaded for the life of the shell, so a
  // signal that is not gated runs for hours between summons. Only two things
  // have to stay live while the overlay is hidden: which windows exist, and
  // which one is focused — together they keep MRU order correct for the next
  // summon. Everything else describes how the switcher would *look*, and is
  // worth exactly nothing until it is on screen.
  Connections {
    target: ToplevelManager.toplevels
    // The window set itself: needed closed, so MRU pruning and the keys for
    // newly opened windows are already right when the user hits the key.
    function onValuesChanged() { compositor.refreshRequested() }
  }

  Connections {
    target: ToplevelManager
    function onActiveToplevelChanged() { compositor.activeWindowChanged() }
  }

  Connections {
    target: Hyprland.toplevels
    // Hyprland's IPC snapshot re-emits on every title and geometry change. It
    // feeds previews and workspace placement only, so a terminal repainting
    // its title must not drive a full record rebuild behind a hidden overlay.
    function onValuesChanged() { if (compositor.switcherOpen) compositor.refreshRequested() }
  }

  Connections {
    target: Hyprland
    function onFocusedMonitorChanged() { compositor.screenLayoutChanged() }
    function onFocusedWorkspaceChanged() {
      var workspace = Hyprland.focusedWorkspace
      // Workspace history is recorded whether or not the overlay is showing —
      // that history is the whole point of the workspace view's preselection.
      // Only the model rebuild waits for a summon.
      compositor.workspaceFocusChanged(workspace ? workspace.id : null)
      if (compositor.switcherOpen) compositor.refreshRequested()
    }
    function onRawEvent(event) {
      if (!compositor.switcherOpen || !event) return
      var name = String(event.name || "")
      if (compositor.refreshEventNames.indexOf(name) < 0) return
      compositor.refreshRequested()

      // Layout-changing events also invalidate the IPC geometry snapshot the
      // workspace miniatures are drawn from; re-request it while open.
      if (compositor.geometryEventNames.indexOf(name) >= 0) {
        Hyprland.refreshToplevels()
        compositor.geometryRefreshRequested()
      }
    }
  }

  Connections {
    target: Quickshell
    function onScreensChanged() { compositor.screenLayoutChanged() }
  }

  Connections {
    target: DesktopEntries.applications
    // Installing or removing an application is rare and only changes names and
    // icons, neither of which is visible while the overlay is hidden.
    function onValuesChanged() { if (compositor.switcherOpen) compositor.refreshRequested() }
  }
}
