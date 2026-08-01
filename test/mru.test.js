const assert = require('node:assert/strict')
const mru = require('../model/MruOrder.js')
const { record } = require('./helpers.js')

const windows = [
  record({ key: 'a', sourceIndex: 0, workspaceId: 1 }),
  record({ key: 'b', sourceIndex: 1, workspaceId: 2 }),
  record({ key: 'c', sourceIndex: 2, workspaceId: -99, workspaceName: 'special:music' }),
  record({ key: 'd', sourceIndex: 3, workspaceId: 1, minimized: true })
]

assert.deepEqual(mru.noteMru(['b', 'a', 'gone'], 'a', windows, 200), ['a', 'b'])
assert.deepEqual(mru.pruneMru(['d', 'd', 'missing', 'b'], windows, 200), ['d', 'b'],
  'duplicates and dead keys are pruned')
assert.deepEqual(mru.pruneMru(['a', 'b', 'c'], windows, 2), ['a', 'b'], 'the list respects its cap')
assert.deepEqual(mru.orderByMru(windows, ['c', 'a']).map(item => item.key), ['c', 'a', 'b', 'd'])

console.log('ok - mru order')
