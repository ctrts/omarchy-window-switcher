const assert = require('node:assert/strict')
const nav = require('../model/Navigation.js')

assert.equal(nav.initialSelection(0, 1), -1)
assert.equal(nav.initialSelection(1, 1), 0)
assert.equal(nav.initialSelection(4, 1), 1)
assert.equal(nav.initialSelection(4, -1), 3)
assert.equal(nav.moveSequential(3, 1, 4), 0)
assert.equal(nav.moveSequential(0, -1, 4), 3)
assert.equal(nav.moveGrid(2, 1, 0, 5, 3), 0)
assert.equal(nav.moveGrid(3, -1, 0, 5, 3), 4)
assert.equal(nav.moveGrid(1, 0, 1, 5, 3), 4)
assert.equal(nav.moveGrid(4, 0, 1, 5, 3), 1)
assert.equal(nav.moveGrid(0, 0, -1, 5, 3), 3)
assert.equal(nav.moveGrid(2, 0, 1, 5, 3), 4)

// Grouped navigation: two groups sized [2, 3] laid out over 2 columns.
assert.equal(nav.moveGrouped(1, 1, 0, [2, 3], 2), 2, 'horizontal walks the flat order across sections')
assert.equal(nav.moveGrouped(0, -1, 0, [2, 3], 2), 4, 'horizontal wraps around the ends')
assert.equal(nav.moveGrouped(0, 0, 1, [2, 3], 2), 2, 'down continues into the next section, same column')
assert.equal(nav.moveGrouped(3, 0, 1, [2, 3], 2), 4, 'down clamps to a shorter final row')
assert.equal(nav.moveGrouped(4, 0, 1, [2, 3], 2), 0, 'down wraps from the last section to the first')
assert.equal(nav.moveGrouped(0, 0, -1, [2, 3], 2), 4, 'up wraps to the last row of the last section')
assert.equal(nav.moveGrouped(2, 0, -1, [2, 3], 2), 0, 'up enters the previous section at its last row')
assert.equal(nav.moveGrouped(0, 0, 1, [], 2), -1)

// A sticky desired column makes vertical movement reversible. Without one,
// clamping into a short last row rewrites the column: 5 items across 3
// columns went 2 -> Down -> 4 -> Up -> 1 and never came back.
assert.equal(nav.columnOf(2, 3), 2, 'a flat index reports its column')
assert.equal(nav.columnOf(4, 3), 1, 'the short last row reports the column it landed in')
assert.equal(nav.columnOfGrouped(3, [2, 3], 2), 1, 'a grouped column is relative to its section')
assert.equal(nav.columnOfGrouped(0, [2, 3], 2), 0, 'the first card of the first section is column 0')

assert.equal(nav.moveGrid(2, 0, 1, 5, 3, 2), 4, 'down still clamps into the short row')
assert.equal(nav.moveGrid(4, 0, -1, 5, 3, 2), 2,
  'up returns to the held column, not the one the clamp produced')
assert.equal(nav.moveGrid(4, 0, -1, 5, 3), 1,
  'without a held column the old, non-reversible behaviour is unchanged')

// The round trip itself, which is the property that matters.
var held = nav.columnOf(2, 3)
var down = nav.moveGrid(2, 0, 1, 5, 3, held)
assert.equal(nav.moveGrid(down, 0, -1, 5, 3, held), 2, 'down then up returns to the start')

var groupedHeld = nav.columnOfGrouped(1, [2, 3], 2)
var groupedDown = nav.moveGrouped(1, 0, 1, [2, 3], 2, groupedHeld)
assert.equal(nav.moveGrouped(groupedDown, 0, -1, [2, 3], 2, groupedHeld), 1,
  'grouped down then up returns to the start')

// Card reveal inside a section taller than the viewport.
assert.equal(nav.revealOffset(100, 400, 120, 160, 0, 900), 100,
  'a visible card keeps the current scroll position')
assert.equal(nav.revealOffset(300, 400, 120, 160, 0, 900), 120,
  'a card above the viewport scrolls to its top')
assert.equal(nav.revealOffset(100, 400, 620, 160, 0, 900), 380,
  'a card below the viewport scrolls to its bottom edge')
assert.equal(nav.revealOffset(800, 400, 1100, 300, 0, 900), 900,
  'the reveal position stays inside the content range')

console.log('ok - navigation')
