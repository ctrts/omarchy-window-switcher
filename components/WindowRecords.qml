import QtQuick
import Quickshell
import Quickshell.Hyprland
import "../model/WindowSwitcherModel.js" as WindowModel
import "../model/EntryMatching.js" as EntryMatching

// Non-visual record builder: turns compositor toplevels into the plain
// records the model functions operate on.
QtObject {
  id: records

  property var shell: null
  property var objectKeyRows: []
  property int nextObjectKey: 1
  readonly property string fallbackIconName: "application-x-executable"
  readonly property string objectKeyPrefix: "object:"
  readonly property string hyprlandKeyPrefix: "hyprland:"

  function desktopEntries() {
    if (shell && shell.appLibrary && typeof shell.appLibrary.sortedEntries === "function") {
      var rows = shell.appLibrary.sortedEntries("")
      var result = []
      for (var i = 0; i < rows.length; i++) if (rows[i] && rows[i].entry) result.push(rows[i].entry)
      return result
    }
    try { return DesktopEntries.applications.values || [] } catch (error) { return [] }
  }

  function iconSource(entry, appId) {
    if (shell && shell.appLibrary && typeof shell.appLibrary.iconSource === "function")
      return shell.appLibrary.iconSource(entry ? entry.icon : appId)
    var requested = String(entry && entry.icon ? entry.icon : appId || fallbackIconName)
    var source = Quickshell.iconPath(requested, true)
    return source || Quickshell.iconPath(fallbackIconName, true)
  }

  // Desktop-entry matching normalizes every installed entry with two regex
  // passes, so it costs windows x installed-applications per rebuild. Windows
  // of the same application share one answer, and a session runs far fewer
  // applications than it has windows open. Reset per rebuild by syncObjectKeys
  // so an installed or removed application is picked up at the next summon.
  property var appMemo: ({})

  function appInfoFor(appId, entries) {
    var cacheKey = String(appId || "")
    var cached = appMemo[cacheKey]
    if (cached) return cached
    var entry = EntryMatching.findDesktopEntry(appId, entries)
    var info = {
      entry: entry,
      appName: entry ? String(entry.name || entry.id || appId) : String(appId),
      iconSource: iconSource(entry, appId)
    }
    appMemo[cacheKey] = info
    return info
  }

  function hyprlandToplevelFor(toplevel) {
    var values = Hyprland.toplevels ? Hyprland.toplevels.values : []
    for (var i = 0; i < values.length; i++) {
      if (values[i] && values[i].wayland === toplevel) return values[i]
    }
    return null
  }

  function syncObjectKeys(toplevels) {
    var next = []
    for (var i = 0; i < toplevels.length; i++) {
      var toplevel = toplevels[i]
      var existingKey = ""
      for (var j = 0; j < objectKeyRows.length; j++) {
        if (objectKeyRows[j].toplevel === toplevel) {
          existingKey = objectKeyRows[j].key
          break
        }
      }
      if (!existingKey) existingKey = objectKeyPrefix + nextObjectKey++
      next.push({ toplevel: toplevel, key: existingKey })
    }
    objectKeyRows = next
    // This runs once at the top of every rebuild, before any recordFor call,
    // which makes it the right place to drop the per-rebuild lookup cache.
    appMemo = ({})
  }

  function fallbackKeyFor(toplevel) {
    for (var i = 0; i < objectKeyRows.length; i++) {
      if (objectKeyRows[i].toplevel === toplevel) return objectKeyRows[i].key
    }
    return ""
  }

  function monitorRectFor(monitor) {
    if (!monitor) return null
    var ipc = monitor.lastIpcObject || {}
    var scale = Number(monitor.scale !== undefined ? monitor.scale : ipc.scale)
    if (!isFinite(scale) || scale <= 0) scale = 1
    var width = Number(monitor.width !== undefined ? monitor.width : ipc.width) || 0
    var height = Number(monitor.height !== undefined ? monitor.height : ipc.height) || 0
    if (ipc.transform !== undefined && Number(ipc.transform) % 2 === 1) {
      var swap = width
      width = height
      height = swap
    }
    if (!width || !height) return null
    return {
      x: Number(monitor.x !== undefined ? monitor.x : ipc.x) || 0,
      y: Number(monitor.y !== undefined ? monitor.y : ipc.y) || 0,
      width: width / scale,
      height: height / scale
    }
  }

  function recordFor(toplevel, sourceIndex, entries) {
    var hyprland = hyprlandToplevelFor(toplevel)
    var ipc = hyprland && hyprland.lastIpcObject ? hyprland.lastIpcObject : {}
    var at = Array.isArray(ipc.at) ? ipc.at : null
    var ipcSize = Array.isArray(ipc.size) ? ipc.size : null
    var appId = String((toplevel && toplevel.appId) || ipc.class || ipc.initialClass || "")
    var appInfo = appInfoFor(appId, entries)
    var workspace = hyprland ? hyprland.workspace : null
    var monitor = hyprland ? hyprland.monitor : null
    var address = String(hyprland && hyprland.address ? hyprland.address : "")
    var title = String((toplevel && toplevel.title) || (hyprland && hyprland.title) || appId || "Untitled window")
    var workspaceId = workspace ? workspace.id : null
    var workspaceName = workspace ? String(workspace.name || workspace.id || "") : ""
    var monitorId = monitor ? monitor.id : null
    var monitorName = monitor ? String(monitor.name || "") : ""
    var focusHistoryId = Number(ipc.focusHistoryID)
    if (!isFinite(focusHistoryId) || focusHistoryId < 0) focusHistoryId = sourceIndex
    var record = {
      key: address ? hyprlandKeyPrefix + address : fallbackKeyFor(toplevel),
      sourceIndex: focusHistoryId,
      toplevel: toplevel,
      address: address,
      appId: appId,
      appName: appInfo.appName,
      iconSource: appInfo.iconSource,
      title: title,
      workspaceId: workspaceId,
      workspaceName: workspaceName,
      workspaceActive: workspace ? workspace.active === true : false,
      monitorId: monitorId,
      monitorName: monitorName,
      rect: at && ipcSize ? {
        x: Number(at[0]) || 0,
        y: Number(at[1]) || 0,
        width: Number(ipcSize[0]) || 0,
        height: Number(ipcSize[1]) || 0
      } : null,
      monitorRect: monitorRectFor(monitor),
      active: (toplevel && toplevel.activated === true) || (hyprland && hyprland.activated === true),
      urgent: hyprland && hyprland.urgent === true,
      minimized: toplevel && toplevel.minimized === true
    }
    record.contextLabel = WindowModel.workspaceLabel(record)
    record.workspaceChip = WindowModel.workspaceChipLabel(record)
    // Filtering rebuilt this lowercase haystack for every record on every
    // keystroke, across two or three passes. Every part of it below is fixed
    // for the life of the record, so it is joined once here. The workspace
    // alias is deliberately left out: a rename changes it while the record
    // lives, so the filter appends it at query time.
    record.searchBase = [
      record.appName,
      record.appId,
      record.title,
      record.workspaceName,
      record.monitorName
    ].join(" ").toLowerCase()
    return record
  }

}
