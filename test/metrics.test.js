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

// Regression: N columns carry N-1 gaps, and that is exactly what the column
// count solves for. Charging a full gap to every cell instead spent one gap
// too many and took 1200px at a 160px minimum down to a 159px card — under
// the floor the column count had just promised.
const gapFit = metricsModel.flowMetrics(1200, 12, 160, 1.6, 68)
assert.equal(gapFit.columns, 7, 'seven 160px columns and six gaps fit in 1200px')
assert.ok(gapFit.cardWidth >= 160,
  `seven columns must hold the readable floor, got ${gapFit.cardWidth}`)

for (const width of [400, 700, 1000, 1200, 1400, 1920, 2560, 3440]) {
  const metrics = metricsModel.flowMetrics(width, 12, 160, 1.6, 68)
  const spanned = metrics.cardWidth * metrics.columns + 12 * (metrics.columns - 1)
  assert.ok(spanned <= width,
    `at ${width}px the cards and their gaps stay inside the viewport (${spanned})`)
  // One column is the degenerate case: a viewport narrower than the minimum
  // has nothing to give, so the floor only binds once the grid really splits.
  if (metrics.columns > 1) {
    assert.ok(metrics.cardWidth >= 160,
      `at ${width}px a multi-column grid stays readable, got ${metrics.cardWidth}`)
  }
}

// The same accounting in the scrolling fallback, which exists precisely to
// hold the readable minimum and previously recomputed the identical 159.
const scrolled = metricsModel.gridMetrics(60, 1200, 600, 12, 160, 1.6, 68)
assert.ok(scrolled.cardWidth >= 160,
  `the scrolling fallback holds the readable floor, got ${scrolled.cardWidth}`)

console.log('ok - metrics')

// A selected card grows by SELECTED_SCALE plus its ring; sized against the
// fit height, a lone card still fits the real viewport once it is selected.
{
  const viewport = 700
  const ring = 4
  const fit = metricsModel.selectionFitHeight(viewport, ring)
  const lone = metricsModel.gridMetrics(1, 1800, fit, 12, 240, 16 / 9, 68)
  assert.ok(lone.cardHeight * metricsModel.SELECTED_SCALE + ring * 2 <= viewport,
    'the selected card keeps its borders inside the view')
}

assert.equal(metricsModel.monitorAspect([{}, { monitorRect: { width: 1920, height: 1200 } }]), 1.6,
  'cards take the shape of the monitor their windows are on')
assert.equal(metricsModel.monitorAspect([]), 16 / 9, 'no placed window falls back to 16:9')
