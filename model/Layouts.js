// Workspace layout catalog, schematic preview geometry, and the compositor
// request that applies a layout. Standalone on purpose — this file is loaded
// both by QML and by the Node test harness, so it must not depend on any other
// model file.
//
// The ids must match hypr/layouts.lua, which does the work inside Hyprland.

var GROUP_TILING = "tiling"
var GROUP_ARRANGEMENT = "arrangement"

var FAMILY_ARRANGEMENT = "lua"

var LAYOUTS = [
  { id: "dwindle", label: "Dwindle", group: GROUP_TILING, family: "dwindle" },
  { id: "scrolling", label: "Scrolling", group: GROUP_TILING, family: "scrolling" },
  { id: "monocle", label: "Monocle", group: GROUP_TILING, family: "monocle" },
  { id: "master-left", label: "Main left", group: GROUP_TILING, family: "master" },
  { id: "master-right", label: "Main right", group: GROUP_TILING, family: "master" },
  { id: "master-top", label: "Main top", group: GROUP_TILING, family: "master" },
  { id: "master-center", label: "Main center", group: GROUP_TILING, family: "master" },
  { id: "columns", label: "Columns", group: GROUP_ARRANGEMENT, family: FAMILY_ARRANGEMENT },
  { id: "rows", label: "Rows", group: GROUP_ARRANGEMENT, family: FAMILY_ARRANGEMENT },
  { id: "grid", label: "Grid", group: GROUP_ARRANGEMENT, family: FAMILY_ARRANGEMENT }
]

// Hyprland defaults, used only to draw the schematics.
var MASTER_FACTOR = 0.55
var SCROLL_COLUMN_WIDTH = 0.49
var PREVIEW_MAX_WINDOWS = 6

function layoutById(id) {
  for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].id === id) return LAYOUTS[i]
  return null
}

// Alt+1 … Alt+9 pick the first nine layouts and Alt+0 the tenth.
function layoutForDigit(digit) {
  var value = Math.floor(Number(digit))
  if (!isFinite(value) || value < 0 || value > 9) return null
  var index = value === 0 ? 9 : value - 1
  return index < LAYOUTS.length ? LAYOUTS[index] : null
}

function shortcutKey(index) {
  var value = Number(index)
  if (value >= 0 && value < 9) return String(value + 1)
  return value === 9 ? "0" : ""
}

// A single window fills the screen in every layout, which makes the choice
// impossible to read. Drawing at least two windows shows each layout's shape;
// the cap keeps the cells large enough to see.
function previewCount(windowCount) {
  var count = Math.floor(Number(windowCount) || 0)
  return Math.max(2, Math.min(PREVIEW_MAX_WINDOWS, count))
}

function rect(x, y, width, height) {
  return { x: x, y: y, width: width, height: height }
}

function stack(count, x, y, width, height, vertical) {
  var cells = []
  for (var i = 0; i < count; i++) {
    cells.push(vertical
      ? rect(x, y + height * i / count, width, height / count)
      : rect(x + width * i / count, y, width / count, height))
  }
  return cells
}

function dwindleRects(count, aspect) {
  var cells = []
  var region = rect(0, 0, 1, 1)
  for (var i = 0; i < count - 1; i++) {
    // Dwindle splits along the longer side of what is left, in real pixels.
    if (region.width * aspect >= region.height) {
      cells.push(rect(region.x, region.y, region.width / 2, region.height))
      region = rect(region.x + region.width / 2, region.y, region.width / 2, region.height)
    } else {
      cells.push(rect(region.x, region.y, region.width, region.height / 2))
      region = rect(region.x, region.y + region.height / 2, region.width, region.height / 2)
    }
  }
  cells.push(region)
  return cells
}

function scrollingRects(count) {
  var cells = []
  for (var i = 0; i < count; i++) {
    var x = i * SCROLL_COLUMN_WIDTH
    if (x >= 1) break
    cells.push(rect(x, 0, Math.min(SCROLL_COLUMN_WIDTH, 1 - x), 1))
  }
  return cells
}

function monocleRects(count) {
  // Every window takes the whole area; offsets hint at the ones underneath.
  var layers = Math.min(3, count)
  var step = 0.05
  var cells = []
  for (var i = layers - 1; i >= 0; i--)
    cells.push(rect(step * i, step * i, 1 - step * (layers - 1), 1 - step * (layers - 1)))
  return cells
}

function masterRects(count, orientation) {
  if (count <= 1) return [rect(0, 0, 1, 1)]
  var others = count - 1
  var main = MASTER_FACTOR
  if (orientation === "center" && others >= 2) {
    var side = (1 - main) / 2
    // Hyprland gives the left side the odd window out.
    var left = Math.ceil(others / 2)
    var right = others - left
    return [rect(side, 0, main, 1)]
      .concat(stack(left, 0, 0, side, 1, true))
      .concat(stack(right, side + main, 0, side, 1, true))
  }
  if (orientation === "right")
    return [rect(1 - main, 0, main, 1)].concat(stack(others, 0, 0, 1 - main, 1, true))
  if (orientation === "top")
    return [rect(0, 0, 1, main)].concat(stack(others, 0, main, 1, 1 - main, false))
  // Left, and center with too few windows to flank the main one.
  return [rect(0, 0, main, 1)].concat(stack(others, main, 0, 1 - main, 1, true))
}

function gridRects(count) {
  var columns = Math.ceil(Math.sqrt(count))
  var rows = Math.ceil(count / columns)
  var cells = []
  for (var i = 0; i < count; i++) {
    var column = i % columns
    var row = Math.floor(i / columns)
    cells.push(rect(column / columns, row / rows, 1 / columns, 1 / rows))
  }
  return cells
}

// Normalized cells (0…1) that sketch a layout for `windowCount` windows on a
// monitor of the given aspect ratio. The first cell is the main window.
function previewRects(id, windowCount, aspect) {
  var count = previewCount(windowCount)
  var ratio = Number(aspect) > 0 ? Number(aspect) : 16 / 9
  switch (id) {
  case "dwindle": return dwindleRects(count, ratio)
  case "scrolling": return scrollingRects(count)
  case "monocle": return monocleRects(count)
  case "master-left": return masterRects(count, "left")
  case "master-right": return masterRects(count, "right")
  case "master-top": return masterRects(count, "top")
  case "master-center": return masterRects(count, "center")
  case "columns": return stack(count, 0, 0, 1, 1, false)
  case "rows": return stack(count, 0, 0, 1, 1, true)
  case "grid": return gridRects(count)
  }
  return []
}

// Not a workspace layout: the strip's Window section toggles Hyprland
// fullscreen for the workspace's most recent window.
var FULLSCREEN = { id: "fullscreen", label: "Fullscreen", family: "fullscreen", shortcut: "F" }

function fullscreenPreviewRects() {
  return [rect(0, 0, 1, 1)]
}

function familyOfTiledLayout(tiledLayout) {
  var name = String(tiledLayout || "")
  return name.indexOf("lua:") === 0 ? FAMILY_ARRANGEMENT : name
}

// Hyprland reports "master" without its orientation, and reports registered
// layouts by a name that is not reliable per workspace. The layout the
// switcher last applied fills that gap for as long as it still agrees with
// what the compositor reports; otherwise only unambiguous names are marked.
function currentLayoutId(tiledLayout, appliedId) {
  var family = familyOfTiledLayout(tiledLayout)
  if (!family) return ""
  var applied = layoutById(appliedId)
  if (applied && applied.family === family) return applied.id
  var exact = layoutById(family)
  return exact && exact.family === family ? exact.id : ""
}

// Workspace selector for a rule plus the saved-file id, or null when a group
// is not a workspace a rule can name.
function workspaceTarget(workspaceId, workspaceName) {
  var id = Number(workspaceId)
  if (!isFinite(id) || Math.floor(id) !== id || id === 0) return null
  if (id > 0) return { selector: String(id), fileId: id }
  var name = String(workspaceName || "")
  if (!/^special:[A-Za-z0-9_-]+$/.test(name)) return null
  return { selector: name, fileId: id }
}

// Hyprland addresses are hex; Quickshell may report them without the prefix.
function windowAddress(address) {
  var value = String(address || "")
  if (value.indexOf("0x") !== 0) value = "0x" + value
  return /^0x[0-9a-fA-F]+$/.test(value) ? value.toLowerCase() : ""
}

function fullscreenRequest(address) {
  var value = windowAddress(address)
  if (!value) return ""
  return 'function() hl.dispatch(hl.dsp.window.fullscreen({ mode = "fullscreen", window = "address:'
    + value + '" })) end'
}

function localPath(url) {
  var value = String(url || "")
  if (value.indexOf("file://") === 0) value = value.slice("file://".length)
  try { value = decodeURIComponent(value) } catch (error) { return "" }
  return value
}

// A JSON string with no control characters is also a valid Lua string
// literal: both escape only quotes and backslashes in that case.
function luaString(value) {
  var text = String(value)
  if (/[ -]/.test(text)) return ""
  return JSON.stringify(text)
}

// The request for Hyprland.dispatch(). Hyprland evaluates a dispatch as
// `hl.dispatch(<request>)`, which accepts a function, so the layout module
// runs inside the compositor. Every interpolated value is a validated
// workspace, a catalog id, or the plugin's own file path.
function dispatchRequest(layoutId, workspaceId, workspaceName, moduleUrl) {
  if (!layoutById(layoutId)) return ""
  var target = workspaceTarget(workspaceId, workspaceName)
  if (!target) return ""
  var path = localPath(moduleUrl)
  if (path.charAt(0) !== "/") return ""
  var source = luaString(path)
  if (!source) return ""
  return "function() dofile(" + source + ").apply("
    + luaString(target.selector) + ", " + target.fileId + ", "
    + luaString(layoutId) + ", " + source + ") end"
}

if (typeof module !== "undefined") {
  module.exports = {
    GROUP_TILING: GROUP_TILING,
    GROUP_ARRANGEMENT: GROUP_ARRANGEMENT,
    LAYOUTS: LAYOUTS,
    FULLSCREEN: FULLSCREEN,
    fullscreenPreviewRects: fullscreenPreviewRects,
    windowAddress: windowAddress,
    fullscreenRequest: fullscreenRequest,
    PREVIEW_MAX_WINDOWS: PREVIEW_MAX_WINDOWS,
    layoutById: layoutById,
    layoutForDigit: layoutForDigit,
    shortcutKey: shortcutKey,
    previewCount: previewCount,
    previewRects: previewRects,
    familyOfTiledLayout: familyOfTiledLayout,
    currentLayoutId: currentLayoutId,
    workspaceTarget: workspaceTarget,
    localPath: localPath,
    luaString: luaString,
    dispatchRequest: dispatchRequest
  }
}
