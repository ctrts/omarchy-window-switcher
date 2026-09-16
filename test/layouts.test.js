const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const layouts = require('../model/Layouts.js')

const ids = layouts.LAYOUTS.map(layout => layout.id)
assert.equal(new Set(ids).size, ids.length, 'layout ids are unique')
assert.ok(ids.length <= 10, 'every layout has an Alt+digit shortcut')

// hypr/layouts.lua does the work inside Hyprland; an id it does not know would
// be a thumbnail that silently does nothing.
const lua = fs.readFileSync(path.join(__dirname, '..', 'hypr', 'layouts.lua'), 'utf8')
function luaKeys(tableName) {
  const block = new RegExp(`M\\.${tableName} = \\{([\\s\\S]*?)\\n\\}`).exec(lua)
  assert.ok(block, `hypr/layouts.lua declares M.${tableName}`)
  return Array.from(block[1].matchAll(/^  (?:\["([\w-]+)"\]|(\w+)) = /gm), match => match[1] || match[2])
}
assert.deepEqual(
  layouts.LAYOUTS.filter(layout => layout.group === layouts.GROUP_TILING).map(layout => layout.id).sort(),
  luaKeys('NATIVE').sort(),
  'the Hyprland layouts match the Lua module')
assert.deepEqual(
  layouts.LAYOUTS.filter(layout => layout.group === layouts.GROUP_ARRANGEMENT).map(layout => layout.id).sort(),
  luaKeys('ARRANGEMENTS').sort(),
  'the arrangements match the Lua module')

assert.equal(layouts.layoutForDigit(1).id, 'dwindle')
assert.equal(layouts.layoutForDigit(0).id, ids[9], 'Alt+0 picks the tenth layout')
assert.equal(layouts.layoutForDigit(12), null)
assert.equal(layouts.shortcutKey(0), '1')
assert.equal(layouts.shortcutKey(9), '0')
assert.equal(layouts.shortcutKey(10), '')

assert.equal(layouts.previewCount(1), 2, 'one window would draw every layout the same')
assert.equal(layouts.previewCount(4), 4)
assert.equal(layouts.previewCount(40), layouts.PREVIEW_MAX_WINDOWS)

function inside(cell) {
  const epsilon = 1e-9
  return cell.x >= -epsilon && cell.y >= -epsilon && cell.width > 0 && cell.height > 0
    && cell.x + cell.width <= 1 + epsilon && cell.y + cell.height <= 1 + epsilon
}
function area(cells) {
  return cells.reduce((sum, cell) => sum + cell.width * cell.height, 0)
}
for (const id of ids) {
  for (let count = 1; count <= 8; count++) {
    const cells = layouts.previewRects(id, count, 16 / 10)
    assert.ok(cells.length > 0, `${id} draws something for ${count} windows`)
    assert.ok(cells.every(inside), `${id} stays inside the canvas for ${count} windows`)
  }
}

for (const id of ['dwindle', 'master-left', 'master-right', 'master-top', 'master-center', 'columns', 'rows']) {
  for (let count = 2; count <= 6; count++) {
    const cells = layouts.previewRects(id, count, 16 / 10)
    assert.equal(cells.length, count, `${id} draws one cell per window`)
    assert.ok(Math.abs(area(cells) - 1) < 1e-9, `${id} tiles the whole area without overlap for ${count}`)
  }
}

const mainRight = layouts.previewRects('master-right', 3, 16 / 10)[0]
assert.ok(Math.abs(mainRight.x - 0.45) < 1e-9 && mainRight.width === 0.55 && mainRight.height === 1,
  'the main window leads and sits on its named side')
const centered = layouts.previewRects('master-center', 4, 16 / 10)
assert.ok(Math.abs(centered[0].x - 0.225) < 1e-9, 'center puts the main window in the middle')
assert.equal(centered.filter(cell => cell.x === 0).length, 2, 'center puts the odd window out on the left, as Hyprland does')
assert.deepEqual(layouts.previewRects('master-center', 2, 16 / 10),
  layouts.previewRects('master-left', 2, 16 / 10),
  'center falls back to left until there are windows for both sides, as Hyprland does')
assert.deepEqual(layouts.previewRects('dwindle', 2, 16 / 10).map(cell => cell.width), [0.5, 0.5],
  'dwindle splits a landscape area side by side')
assert.deepEqual(layouts.previewRects('dwindle', 3, 16 / 10)[2], { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
  'dwindle splits the tall remainder top and bottom')
assert.equal(layouts.previewRects('grid', 5, 16 / 10).length, 5)
assert.deepEqual(layouts.previewRects('grid', 3, 16 / 10)[2], { x: 0, y: 0.5, width: 0.5, height: 0.5 },
  'grid leaves the rest of the last row empty, as the Lua layout does')
assert.ok(layouts.previewRects('scrolling', 6, 16 / 10).length < 6, 'scrolling shows only the columns on screen')
assert.deepEqual(layouts.previewRects('nope', 3, 1), [])

assert.equal(layouts.familyOfTiledLayout('lua:ctr-grid'), 'lua')
assert.equal(layouts.currentLayoutId('master', 'master-right'), 'master-right',
  'the applied orientation names the current master layout')
assert.equal(layouts.currentLayoutId('master', ''), '', 'an unknown orientation marks nothing')
assert.equal(layouts.currentLayoutId('dwindle', 'master-right'), 'dwindle',
  'a layout changed elsewhere, like SUPER+L, wins over what the switcher applied')
assert.equal(layouts.currentLayoutId('lua:ctr-columns', 'grid'), 'grid',
  'Hyprland does not reliably name the registered layout, so the applied one is used')
assert.equal(layouts.currentLayoutId('lua:ctr-columns', ''), '')
assert.equal(layouts.currentLayoutId('', 'grid'), '', 'no compositor answer marks nothing')

assert.deepEqual(layouts.workspaceTarget(3, '3'), { selector: '3', fileId: 3 })
assert.deepEqual(layouts.workspaceTarget(-98, 'special:scratchpad'), { selector: 'special:scratchpad', fileId: -98 })
assert.equal(layouts.workspaceTarget(-98, 'special:"); os.exit() --'), null, 'special names are validated')
assert.equal(layouts.workspaceTarget(0, '0'), null)
assert.equal(layouts.workspaceTarget(1.5, '1'), null)
assert.equal(layouts.workspaceTarget(null, ''), null)

assert.equal(layouts.localPath('file:///home/a%20b/x.lua'), '/home/a b/x.lua')
assert.equal(layouts.luaString('a"b\\c'), '"a\\"b\\\\c"')
assert.equal(layouts.luaString('bad\nline'), '', 'control characters are refused, not escaped')

const moduleUrl = 'file:///home/me/.config/omarchy/plugins/ctr.window-switcher/hypr/layouts.lua'
assert.equal(
  layouts.dispatchRequest('master-right', 2, '2', moduleUrl),
  'function() dofile("/home/me/.config/omarchy/plugins/ctr.window-switcher/hypr/layouts.lua")'
    + '.apply("2", 2, "master-right", "/home/me/.config/omarchy/plugins/ctr.window-switcher/hypr/layouts.lua") end')
assert.equal(layouts.dispatchRequest('unknown', 2, '2', moduleUrl), '', 'only catalog ids reach the compositor')
assert.equal(layouts.dispatchRequest('grid', 0, '', moduleUrl), '')
assert.equal(layouts.dispatchRequest('grid', 2, '2', 'relative/layouts.lua'), '')
assert.equal(layouts.dispatchRequest('grid', 2, '2', 'file:///tmp/a%0Ab.lua'), '')

assert.equal(layouts.windowAddress('557377d62a00'), '0x557377d62a00', 'Quickshell addresses gain the 0x prefix')
assert.equal(layouts.windowAddress('0x557377D62A00'), '0x557377d62a00')
assert.equal(layouts.windowAddress('0x55" }) os.exit() --'), '')
assert.equal(layouts.windowAddress(''), '')
assert.equal(layouts.fullscreenRequest('0x557377d62a00'),
  'function() hl.dispatch(hl.dsp.window.fullscreen({ mode = "fullscreen", window = "address:0x557377d62a00" })) end')
assert.equal(layouts.fullscreenRequest('nope'), '', 'an invalid address sends nothing')
assert.deepEqual(layouts.fullscreenPreviewRects(), [{ x: 0, y: 0, width: 1, height: 1 }])
assert.ok(!layouts.LAYOUTS.some(layout => layout.id === layouts.FULLSCREEN.id),
  'fullscreen is a window toggle, not a saved workspace layout')

console.log('ok - window switcher layouts')
