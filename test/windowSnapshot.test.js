const assert = require('node:assert/strict')
const snapshot = require('../model/WindowSnapshot.js')

const toplevel = {}
const current = {
  key: 'hyprland:0x1',
  sourceIndex: 0,
  toplevel,
  appId: 'org.example.App',
  appName: 'Example',
  iconSource: 'image://icon/example',
  title: 'Old title',
  workspaceId: 1,
  workspaceName: '1',
  workspaceActive: true,
  monitorId: 0,
  monitorName: 'DP-1',
  contextLabel: '1 · DP-1',
  workspaceChip: '1',
  active: true,
  urgent: false,
  minimized: false,
  rect: { x: 0, y: 0, width: 100, height: 100 },
  monitorRect: { x: 0, y: 0, width: 1920, height: 1080 }
}

function candidate(changes) {
  return Object.assign({}, current, {
    rect: Object.assign({}, current.rect),
    monitorRect: Object.assign({}, current.monitorRect)
  }, changes || {})
}

const titleOnly = candidate({ title: 'New title' })
const reused = snapshot.reconcile([current], [titleOnly])
assert.equal(reused.changed, false, 'a title-only change preserves capture delegates')
assert.equal(reused.records[0], current, 'the preserved snapshot keeps existing record references')

for (const [field, value] of [
  ['key', 'hyprland:0x2'],
  ['sourceIndex', 1],
  ['appId', 'org.example.Replacement'],
  ['workspaceName', 'renamed'],
  ['workspaceId', 2],
  ['workspaceActive', false],
  ['monitorId', 1],
  ['monitorName', 'DP-2'],
  ['appName', 'Renamed application'],
  ['iconSource', 'image://icon/replacement'],
  ['contextLabel', '2 · DP-2'],
  ['workspaceChip', '2'],
  ['active', false],
  ['urgent', true],
  ['minimized', true]
]) {
  const next = candidate({ [field]: value })
  const result = snapshot.reconcile([current], [next])
  assert.equal(result.changed, true, `${field} refreshes the snapshot`)
  assert.equal(result.records[0], next)
}

const moved = candidate({ rect: { x: 20, y: 0, width: 100, height: 100 } })
assert.equal(snapshot.reconcile([current], [moved]).changed, true,
  'window geometry refreshes the snapshot')

const monitorChanged = candidate({
  monitorRect: { x: 0, y: 0, width: 2560, height: 1440 }
})
assert.equal(snapshot.reconcile([current], [monitorChanged]).changed, true,
  'monitor geometry refreshes the snapshot')

const replaced = candidate({ toplevel: {} })
assert.equal(snapshot.reconcile([current], [replaced]).changed, true,
  'a different toplevel refreshes the snapshot')

assert.equal(snapshot.reconcile([current], []).changed, true,
  'a different record count refreshes the snapshot')

console.log('ok - window snapshot')
