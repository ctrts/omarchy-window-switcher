// Card sizing: grid metrics for the fitted window grid and flow metrics for
// scrolling section views. Standalone on purpose — this file is loaded both
// by QML and by the Node test harness, so it must not depend on any other
// model file.
//
// Gap accounting: N columns carry N-1 gaps between them, which is what the
// column count solves for. `cellWidth` stays the cell pitch (width / columns)
// because the views lay delegates out on it, but a card's own width has to
// subtract the same N-1 gaps spread across N cells. Taking a whole gap off
// every cell instead charges one gap too many and pushes cards under the
// readable minimum the column count just guaranteed.

function gridMetrics(count, availableWidth, availableHeight, gap, minimumWidth, previewAspect, chromeHeight) {
  var total = Math.max(0, Math.floor(Number(count) || 0))
  var width = Math.max(1, Number(availableWidth) || 1)
  var height = Math.max(1, Number(availableHeight) || 1)
  var spacing = Math.max(0, Number(gap) || 0)
  var minimum = Math.max(80, Number(minimumWidth) || 160)
  var aspect = Math.max(0.5, Number(previewAspect) || 1.6)
  var chrome = Math.max(0, Number(chromeHeight) || 64)

  if (total === 0) {
    return { columns: 1, rows: 1, cellWidth: width, cellHeight: height, cardWidth: width, cardHeight: height }
  }

  var maximumColumns = Math.min(total, Math.max(1, Math.floor((width + spacing) / (minimum + spacing))))
  if (total <= 4) maximumColumns = total

  // Fitted-first: pick the column count that maximizes preview area inside
  // the viewport, however many windows there are. Only when even the best
  // fitted layout would push cards below the minimum readable width does the
  // view fall back to scrolling rows of minimum-width cards, so large window
  // counts stay readable and small counts on large screens stay large.
  var startColumns = total <= 4 ? total : 1
  var best = null

  for (var columns = startColumns; columns <= maximumColumns; columns++) {
    var rows = Math.ceil(total / columns)
    var cellWidth = width / columns
    var cellHeight = height / rows
    var availableCardWidth = Math.max(1, (width - spacing * (columns - 1)) / columns)
    var availableCardHeight = Math.max(1, cellHeight - spacing)
    var previewWidth = Math.min(availableCardWidth, Math.max(1, (availableCardHeight - chrome) * aspect))
    var previewHeight = previewWidth / aspect
    var cardHeight = previewHeight + chrome
    var score = previewWidth * previewHeight

    if (!best || score > best.score) {
      best = {
        score: score,
        columns: columns,
        rows: rows,
        cellWidth: cellWidth,
        cellHeight: cellHeight,
        cardWidth: Math.floor(previewWidth),
        cardHeight: Math.floor(cardHeight)
      }
    }
  }

  // Up to four windows always keep the fitted single row, even on viewports
  // too narrow for full-size cards; anything larger that cannot reach the
  // readable minimum scrolls instead of shrinking further.
  if (best && (best.cardWidth >= minimum || total <= 4)) {
    delete best.score
    return best
  }

  var scrollingColumns = maximumColumns
  var scrollingRows = Math.ceil(total / scrollingColumns)
  var scrollingCellWidth = width / scrollingColumns
  var scrollingWidth = Math.max(1, (width - spacing * (scrollingColumns - 1)) / scrollingColumns)
  var scrollingHeight = scrollingWidth / aspect + chrome
  return {
    columns: scrollingColumns,
    rows: scrollingRows,
    cellWidth: scrollingCellWidth,
    cellHeight: scrollingHeight + spacing,
    cardWidth: Math.floor(scrollingWidth),
    cardHeight: Math.floor(scrollingHeight)
  }
}

// Uniform card sizing for section views: every section shares one column
// count derived from the available width, so cards align across sections and
// the view scrolls vertically.
function flowMetrics(availableWidth, gap, minimumWidth, previewAspect, chromeHeight) {
  var width = Math.max(1, Number(availableWidth) || 1)
  var spacing = Math.max(0, Number(gap) || 0)
  var minimum = Math.max(80, Number(minimumWidth) || 160)
  var aspect = Math.max(0.5, Number(previewAspect) || 1.6)
  var chrome = Math.max(0, Number(chromeHeight) || 64)

  var columns = Math.max(1, Math.floor((width + spacing) / (minimum + spacing)))
  var cellWidth = width / columns
  var cardWidth = Math.max(1, (width - spacing * (columns - 1)) / columns)
  var cardHeight = cardWidth / aspect + chrome
  return {
    columns: columns,
    cellWidth: cellWidth,
    cellHeight: cardHeight + spacing,
    cardWidth: Math.floor(cardWidth),
    cardHeight: Math.floor(cardHeight)
  }
}

// Compact rows: cells hug their cards vertically, so stacked rows read as
// rows instead of cards floating in stretched cells. The caller centers the
// resulting block in the viewport.
function compactRows(metrics, gap) {
  var spacing = Math.max(0, Number(gap) || 0)
  var result = {}
  for (var key in metrics) result[key] = metrics[key]
  result.cellHeight = Math.min(result.cellHeight, result.cardHeight + spacing)
  return result
}

// Aspect ratio of the monitor the first placed window sits on. Workspace
// cards draw windows on a canvas of this shape, so sizing the cards to it
// instead of a fixed 16:9 keeps the canvas from being letterboxed.
function monitorAspect(windows, fallback) {
  var list = windows || []
  for (var i = 0; i < list.length; i++) {
    var rect = list[i] && list[i].monitorRect ? list[i].monitorRect : null
    if (rect && rect.width > 0 && rect.height > 0) return rect.width / rect.height
  }
  return Number(fallback) > 0 ? Number(fallback) : 16 / 9
}

// The selected card is drawn larger than its slot (CardFrame scales it and
// adds an outer ring), and the views clip at their edges. Fitting cards into
// the full height let a lone tall card grow past the viewport, cutting off
// its top and bottom borders, so fitted grids size against the height that
// is left once that growth is set aside.
var SELECTED_SCALE = 1.04

function selectionFitHeight(availableHeight, ring) {
  var height = Math.max(1, Number(availableHeight) || 1)
  var outline = Math.max(0, Number(ring) || 0)
  return Math.max(1, Math.floor((height - outline * 2) / SELECTED_SCALE))
}

// The same reserve across the width, which was missing. Cards could take
// their whole share of the viewport, so selecting one in the first or last
// column grew it straight into the view's `clip: true` edge and cut the
// miniatures off — while an interior card merely overlapped its neighbour
// and looked fine, which is why this only ever showed at the edges.
function selectionFitWidth(availableWidth, ring) {
  var width = Math.max(1, Number(availableWidth) || 1)
  var outline = Math.max(0, Number(ring) || 0)
  return Math.max(1, Math.floor((width - outline * 2) / SELECTED_SCALE))
}

if (typeof module !== "undefined") {
  module.exports = {
    SELECTED_SCALE: SELECTED_SCALE,
    selectionFitHeight: selectionFitHeight,
    selectionFitWidth: selectionFitWidth,
    monitorAspect: monitorAspect,
    gridMetrics: gridMetrics,
    flowMetrics: flowMetrics,
    compactRows: compactRows
  }
}
