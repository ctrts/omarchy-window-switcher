const assert = require('node:assert/strict')
const metricsModel = require('../model/Metrics.js')

for (const count of [1, 2, 4, 5, 12]) {
  const metrics = metricsModel.gridMetrics(count, 1400, 720, 12, 160, 1.6, 68)
  assert.ok(metrics.columns >= 1 && metrics.columns <= count)
  assert.equal(metrics.rows, Math.ceil(count / metrics.columns))
  assert.ok(metrics.cardWidth > 0)
  assert.ok(metrics.cardHeight > 0)
  assert.ok(metrics.cellWidth >= metrics.cardWidth)
  assert.ok(metrics.cellHeight >= metrics.cardHeight)
  assert.ok(metrics.cellWidth * metrics.columns <= 1400,
    'fitted columns fit within the viewport')
  assert.ok(metrics.cellHeight * metrics.rows <= 720,
    'fitted rows fit within the viewport')
}

assert.equal(metricsModel.gridMetrics(4, 1200, 500, 12, 160, 1.6, 68).columns, 4)

// Fitted-first: above twelve windows the grid keeps optimizing for card size
// instead of collapsing to minimum-width columns. Thirteen windows on a wide
// viewport get few columns of large cards.
const thirteen = metricsModel.gridMetrics(13, 1930, 850, 12, 160, 1.6, 68)
assert.equal(thirteen.columns, 5, 'a wide viewport prefers fewer, larger columns')
assert.equal(thirteen.rows, 3)
assert.ok(thirteen.cardWidth >= 300, 'large screens keep large cards past twelve windows')
assert.ok(thirteen.cellHeight * thirteen.rows <= 850, 'the fitted layout does not scroll')

// Thirty windows still fit this viewport exactly at the readable floor.
const thirty = metricsModel.gridMetrics(30, 1400, 720, 12, 160, 1.6, 68)
assert.ok(thirty.cardWidth >= 160, 'cards never go below the readable minimum')
assert.ok(thirty.cellHeight * thirty.rows <= 720, 'at the floor the layout still fits')

// Past what the viewport can fit at the floor, the grid scrolls instead of
// shrinking cards further.
const forty = metricsModel.gridMetrics(40, 1400, 720, 12, 160, 1.6, 68)
assert.ok(forty.cardWidth >= 160, 'scrolling cards keep readable widths')
assert.ok(forty.cellHeight * forty.rows > 720, 'oversized sets scroll instead of shrinking every row')

// Up to four windows keep their fitted single row even on tiny viewports.
const tiny = metricsModel.gridMetrics(4, 500, 400, 12, 160, 1.6, 68)
assert.equal(tiny.columns, 4)
assert.equal(tiny.rows, 1)
assert.ok(tiny.cellHeight <= 400, 'small counts never scroll')

// Compact rows: cells hug their cards so multi-row grids read as stacked
// rows; cells never grow, and every other metric passes through untouched.
const compact = metricsModel.compactRows(
  { columns: 3, rows: 2, cellWidth: 300, cellHeight: 400, cardWidth: 280, cardHeight: 220 }, 12)
assert.equal(compact.cellHeight, 232)
assert.equal(compact.cellWidth, 300)
assert.equal(compact.columns, 3)
assert.equal(metricsModel.compactRows({ cellHeight: 200, cardHeight: 220 }, 12).cellHeight, 200,
  'compacting never grows cells')

const flow = metricsModel.flowMetrics(1400, 12, 160, 1.6, 68)
assert.equal(flow.columns, 8)
assert.ok(flow.cardWidth >= 160, 'grouped cards keep readable widths')
assert.ok(flow.cellHeight > flow.cardHeight)
assert.equal(metricsModel.flowMetrics(100, 12, 160, 1.6, 68).columns, 1, 'narrow widths still produce one column')

console.log('ok - metrics')
