const assert = require('node:assert/strict')
const model = require('../model/WindowSwitcherModel.js')
const { record } = require('./helpers.js')

assert.equal(model.FILTER_ALL, 'all')
assert.equal(model.FILTER_WORKSPACE, 'workspace')
assert.deepEqual(model.VIEW_VALUES, ['windows', 'grouped', 'workspaces'])
assert.deepEqual(model.WORKSPACE_ORDER_VALUES, ['recent', 'number'])
assert.deepEqual(model.PREVIEW_VALUES, ['none', 'still', 'liveSelected'])
assert.deepEqual(model.ACTIVATION_VALUES, ['explicit', 'release'])
assert.equal(model.SPECIAL_WORKSPACE_PREFIX, 'special:')
assert.equal(model.MINIMIZED_WORKSPACE_NAME, 'special:minimized')
assert.equal(model.NO_WORKSPACE_KEY, 'none')
assert.equal(model.GROUP_SELECTION_PREFIX, 'group:')
assert.deepEqual([model.PILL_ALL, model.PILL_WORKSPACE, model.PILL_LABEL],
  ['all', 'workspace', 'label'])

assert.deepEqual(model.parsePayload('{"scope":"all"}'), { scope: 'all' })
assert.deepEqual(model.parsePayload('not json'), {})
assert.deepEqual(model.parsePayload('[]'), {})
assert.equal(model.hasInvocationOverrides({ direction: 1 }), false,
  'a repeated direction-only summon can move selection without rebuilding models')
assert.equal(model.hasInvocationOverrides({}), false,
  'an empty repeated summon uses the navigation fast path')
assert.equal(model.hasInvocationOverrides({ direction: -1, view: 'windows' }), true,
  'a repeated summon with another option still reapplies and refreshes its model')
assert.deepEqual(
  model.mergeInvocationOverrides(
    model.mergeInvocationOverrides({}, { direction: 1, view: 'windows', previewMode: 'none' }),
    { direction: -1 }),
  { view: 'windows', previewMode: 'none' },
  'direction changes do not discard overrides that last for the current opening')
assert.deepEqual(
  model.mergeInvocationOverrides({ view: 'windows', filter: 'all' }, {
    groupByWorkspace: true,
    scope: 'workspace'
  }),
  { groupByWorkspace: true, scope: 'workspace' },
  'new legacy aliases replace earlier canonical overrides for the same concepts')
assert.deepEqual(
  model.mergeInvocationOverrides({ groupByWorkspace: true, scope: 'workspace' }, {
    view: 'workspaces',
    filter: 'all'
  }),
  { view: 'workspaces', filter: 'all' },
  'new canonical overrides replace earlier legacy aliases for the same concepts')
assert.equal(
  model.optionApplicationKey(model.effectiveOptions({}, { direction: -1 })),
  model.optionApplicationKey(model.effectiveOptions({}, { direction: 1, query: 'ignored here' })),
  'navigation and query state do not invalidate otherwise identical applied options')
assert.notEqual(
  model.optionApplicationKey(model.effectiveOptions({}, { direction: 1 })),
  model.optionApplicationKey(model.effectiveOptions({ previewMode: 'none' }, { direction: 1 })),
  'a stored configuration change invalidates the repeated-summon fast path')

assert.deepEqual(model.normalizeWorkspaceNames({
  1: '  Code   and docs  ',
  2: '',
  3: 42,
  '-1': 'scratch',
  nope: 'ignored'
}), { 1: 'Code and docs' })
assert.equal(model.workspaceAlias({ 7: 'Harnet' }, 7), 'Harnet')
assert.equal(model.workspaceAlias({ '-7': 'Special' }, -7), '')
assert.equal(model.workspaceShortcutKey(10, '10'), '0',
  'workspace 10 advertises the Ctrl+0 shortcut that selects it')

// Filter normalization, including legacy scope names.
assert.deepEqual(model.normalizeFilter('all'), { kind: 'all' })
assert.deepEqual(model.normalizeFilter('monitor'), { kind: 'all' }, 'legacy monitor scope collapses into all')
assert.deepEqual(model.normalizeFilter('workspace'), { kind: 'workspace', id: null })
assert.deepEqual(model.normalizeFilter('current'), { kind: 'workspace', id: null })
assert.deepEqual(model.normalizeFilter('3'), { kind: 'workspace', id: 3 })
assert.deepEqual(model.normalizeFilter(7), { kind: 'workspace', id: 7 })
assert.deepEqual(model.normalizeFilter({ kind: 'workspace', id: '4' }), { kind: 'workspace', id: 4 })
assert.deepEqual(model.normalizeFilter({ kind: 'workspace', id: null }),
  { kind: 'workspace', id: null }, 'a null object id keeps the focused-workspace meaning')
assert.deepEqual(model.normalizeFilter({ kind: 'workspace' }),
  { kind: 'workspace', id: null }, 'a missing object id keeps the focused-workspace meaning')
assert.deepEqual(model.normalizeFilter({ kind: 'workspace', id: false }),
  { kind: 'workspace', id: null }, 'a non-number object id does not become workspace 0')
assert.equal(model.normalizeFilter('nonsense'), null)
assert.equal(model.normalizeFilter(undefined), null)

assert.deepEqual(model.effectiveOptions({}, {}).filter, { kind: 'all' })
assert.equal(model.effectiveOptions({}, {}).filterExplicit, false)
assert.equal(model.effectiveOptions({}, {}).view, 'workspaces')
assert.equal(model.effectiveOptions({}, {}).viewExplicit, false)
assert.equal(model.effectiveOptions({}, {}).workspaceOrder, 'recent')
assert.equal(model.effectiveOptions({}, {}).workspaceOrderExplicit, false)
assert.deepEqual(model.effectiveOptions({ workspaceNames: { 5: 'Research' } }, {}).workspaceNames,
  { 5: 'Research' })
assert.equal(model.effectiveOptions({}, {}).stickyFilter, false)
assert.equal(model.effectiveOptions({}, {}).maxInitialCaptures, 20)
assert.equal(model.effectiveOptions({ groupByWorkspace: true }, {}).view, 'grouped',
  'legacy groupByWorkspace maps onto the view enum')
assert.equal(model.effectiveOptions({}, { view: 'workspaces' }).view, 'workspaces')
assert.equal(model.effectiveOptions({}, { view: 'workspaces' }).viewExplicit, true)
assert.equal(model.effectiveOptions({ view: 'workspaces' }, {}).viewExplicit, false)
assert.equal(model.effectiveOptions({ workspaceOrder: 'number' }, {}).workspaceOrder, 'number')
assert.equal(model.effectiveOptions({}, { workspaceOrder: 'number' }).workspaceOrderExplicit, true)
assert.equal(model.effectiveOptions({}, { workspaceOrder: 'invalid' }).workspaceOrder, 'recent')
assert.deepEqual(model.effectiveOptions({ defaultScope: 'monitor' }, {}).filter, { kind: 'all' })
assert.deepEqual(model.effectiveOptions({ defaultScope: 'workspace' }, {}).filter, { kind: 'workspace', id: null })
assert.deepEqual(model.effectiveOptions({}, { filter: 6 }).filter, { kind: 'workspace', id: 6 })
assert.equal(model.effectiveOptions({}, { filter: 6 }).filterExplicit, true)
assert.deepEqual(model.effectiveOptions({ defaultFilter: 'workspace' }, { scope: 'all' }).filter,
  { kind: 'all' }, 'invocation overrides stored defaults')
assert.deepEqual(
  model.effectiveOptions({}, {
    maxInitialCaptures: 'invalid',
    animationMs: 'invalid',
    direction: 'invalid'
  }),
  {
    filter: { kind: 'all' },
    filterExplicit: false,
    view: 'workspaces',
    viewExplicit: false,
    workspaceOrder: 'recent',
    workspaceOrderExplicit: false,
    workspaceNames: {},
    stickyFilter: false,
    previewMode: 'still',
    activation: 'explicit',
    showMinimized: true,
    showSpecialWorkspaces: true,
    maxInitialCaptures: 20,
    animationMs: 140,
    query: '',
    direction: 1
  },
  'invalid numbers use defaults instead of unrelated range limits')
assert.deepEqual(
  [
    model.effectiveOptions({}, { maxInitialCaptures: false }).maxInitialCaptures,
    model.effectiveOptions({}, { animationMs: [] }).animationMs,
    model.effectiveOptions({}, { direction: {} }).direction,
    model.effectiveOptions({}, { direction: ' ' }).direction
  ],
  [20, 140, 1, 1],
  'non-number types and blank strings use numeric defaults')

assert.deepEqual(
  model.effectiveOptions(
    { defaultScope: 'monitor', previewMode: 'liveSelected', maxInitialCaptures: 99, groupByWorkspace: true },
    { scope: 'workspace', activation: 'release', animationMs: -50, query: 'x'.repeat(200), direction: -1 }
  ),
  {
    filter: { kind: 'workspace', id: null },
    filterExplicit: true,
    view: 'grouped',
    viewExplicit: false,
    workspaceOrder: 'recent',
    workspaceOrderExplicit: false,
    workspaceNames: {},
    stickyFilter: false,
    previewMode: 'liveSelected',
    activation: 'release',
    showMinimized: true,
    showSpecialWorkspaces: true,
    maxInitialCaptures: 20,
    animationMs: 0,
    query: 'x'.repeat(128),
    direction: -1
  }
)

const windows = [
  record({ key: 'a', sourceIndex: 0, title: 'Notes', workspaceId: 1, workspaceName: '1', monitorId: 0 }),
  record({ key: 'b', sourceIndex: 1, title: 'Browser', workspaceId: 2, workspaceName: '2', monitorId: 0 }),
  record({ key: 'c', sourceIndex: 2, title: 'Music', workspaceId: -99, workspaceName: 'special:music', workspaceActive: true, monitorId: 1 }),
  record({ key: 'd', sourceIndex: 3, title: 'Hidden', workspaceId: 1, workspaceName: '1', monitorId: 0, minimized: true })
]

const context = { focusedWorkspaceId: 1, focusedMonitorId: 0, focusedMonitorName: 'DP-1' }
const ALL = { kind: 'all' }
const CURRENT = { kind: 'workspace', id: null }

assert.deepEqual(model.filterWindows(windows, '', CURRENT, context, true, true).map(item => item.key), ['a', 'c', 'd'],
  'current-workspace filter keeps active special workspaces')
assert.deepEqual(model.filterWindows(windows, '', { kind: 'workspace', id: 2 }, context, true, true).map(item => item.key), ['b'],
  'explicit workspace filter excludes the active special overlay')
assert.deepEqual(model.filterWindows(windows, 'browser', ALL, context, true, true).map(item => item.key), ['b'])
assert.deepEqual(model.filterWindows(windows, 'research', ALL, context, true, true,
  { 2: 'Research' }).map(record => record.key), ['b'], 'local workspace aliases are searchable')
assert.deepEqual(model.filterWindows(windows, '', ALL, context, true, false).map(item => item.key), ['a', 'b', 'd'])
assert.deepEqual(model.filterWindows(windows, '', { kind: 'workspace', id: 1 }, context, false, true).map(item => item.key), ['a', 'c'])
assert.deepEqual(model.filterWindows([
  record({ key: 'scratch-minimized', workspaceId: -98, workspaceName: 'special:minimized' })
], '', ALL, context, false, true), [],
  'hiding minimized windows also hides the Omarchy minimized special workspace')
assert.equal(model.isMinimizedWindow(record({ workspaceName: 'special:minimized' })), true)
assert.equal(model.isMinimizedWindow(record({ workspaceName: 'special:music' })), false)

// Cached search haystacks. WindowRecords precomputes the record-intrinsic part
// of the search text; the filter appends the workspace alias at query time,
// because a rename changes the alias while the record lives.
const cached = record({ key: 'cached', title: 'Ledger', appName: 'Numbers', workspaceId: 3, workspaceName: '3' })
cached.searchBase = 'numbers org.example.numbers ledger 3 dp-1'
assert.deepEqual(
  model.filterWindows([cached], 'ledger', ALL, context, true, true).map(item => item.key),
  ['cached'], 'a prebuilt haystack is used for matching')

// Proves the cache is live rather than dead code: matching has to follow
// searchBase, not the fields it happened to be built from.
const diverged = record({ key: 'diverged', title: 'Invisible' })
diverged.searchBase = 'sentinelword'
assert.deepEqual(
  model.filterWindows([diverged], 'sentinelword', ALL, context, true, true).map(item => item.key),
  ['diverged'], 'the cached haystack is what the filter reads')
assert.deepEqual(model.filterWindows([diverged], 'invisible', ALL, context, true, true), [],
  'fields absent from the cached haystack do not match')

// The alias is the one searchable field a user edits in place, so it must keep
// working on records that already carry a cached haystack.
assert.deepEqual(
  model.filterWindows([cached], 'research', ALL, context, true, true, { 3: 'Research' }).map(item => item.key),
  ['cached'], 'aliases stay searchable on records with a cached haystack')
assert.deepEqual(model.filterWindows([cached], 'research', ALL, context, true, true), [],
  'without that alias the same query matches nothing')

// Records without the cache (older snapshots, and these helpers) still match.
assert.equal(model.queryMatches(record({ title: 'Fallback' }), 'fallback'), true,
  'records without a cached haystack fall back to joining their fields')

// Terms are split once per pass now. Empty terms from stray whitespace must not
// survive as an empty substring, which would match everything.
assert.equal(model.queryMatches(record({ title: 'Notes', appName: 'Editor' }), '  notes   editor  '), true,
  'multi-term queries ignore surrounding and repeated whitespace')
assert.equal(model.queryMatches(record({ title: 'Notes' }), 'notes missing'), false,
  'every term has to match')
assert.equal(model.queryMatches(record({ title: 'Notes' }), '   '), true,
  'a whitespace-only query filters nothing')

// The visibility toggle only appears when it has something to reveal, and it
// counts against every window rather than the filtered set so that it cannot
// vanish mid-search.
assert.equal(model.minimizedCount(windows, true), 1)
assert.equal(model.minimizedCount([], true), 0)
assert.equal(model.minimizedCount([record({ key: 'plain' })], true), 0)
const specialMinimized = [record({ key: 'stashed', workspaceId: -98, workspaceName: 'special:minimized' })]
assert.equal(model.minimizedCount(specialMinimized, true), 1)
assert.equal(model.minimizedCount(specialMinimized, false), 0,
  'the toggle stays hidden when the special-workspace gate already excludes every minimized window')

// Occupied workspaces and the pill header model.
const occupied = model.occupiedWorkspaces(windows, context)
assert.deepEqual(occupied.map(row => [row.id, row.label, row.count, row.focused, row.special]), [
  [1, '1', 2, true, false],
  [2, '2', 1, false, false],
  [-99, 'music', 1, false, true]
])

const urgentRows = model.occupiedWorkspaces([
  record({ key: 'calm', workspaceId: 1 }),
  record({ key: 'loud', workspaceId: 2, workspaceName: '2', urgent: true })
], context)
assert.equal(urgentRows[0].urgent, false)
assert.equal(urgentRows[1].urgent, true, 'a workspace holding an urgent window is flagged')
assert.equal(model.pillRows([record({ key: 'loud', workspaceId: 2, workspaceName: '2', urgent: true })], context)[1].urgent,
  true, 'pills surface urgency')

const singleMonitorPills = model.pillRows(windows, context)
assert.deepEqual(singleMonitorPills.map(pill => pill.type), ['all', 'workspace', 'workspace', 'workspace'],
  'one monitor produces no monitor labels')
assert.equal(singleMonitorPills[0].count, 4)
assert.equal(singleMonitorPills[1].focused, true)

const multiMonitorWindows = windows.map(item =>
  item.key === 'c' ? Object.assign({}, item, { monitorName: 'DP-2' }) : item)
assert.deepEqual(model.pillRows(multiMonitorWindows, context).map(pill => [pill.type, pill.label]), [
  ['all', 'All'],
  ['label', 'DP-1'],
  ['workspace', '1'],
  ['workspace', '2'],
  ['label', 'DP-2'],
  ['workspace', 'music']
], 'monitor labels appear only with more than one monitor')

assert.equal(model.filterLabel({ kind: 'workspace', id: 1 }, windows), 'workspace 1')
assert.equal(model.filterLabel({ kind: 'workspace', id: -99 }, windows), 'music')
assert.equal(model.filterLabel({ kind: 'workspace', id: 7 }, windows), 'workspace 7')
assert.equal(model.filterLabel(ALL, windows), '')

assert.equal(model.countLabel(4, 4, ALL, ''), '4 windows')
assert.equal(model.countLabel(1, 1, ALL, ''), '1 window')
assert.equal(model.countLabel(1, 4, ALL, 'browser'), '1 of 4')
assert.equal(model.countLabel(2, 4, { kind: 'workspace', id: 1 }, '', 'workspace 1'), '2 of 4 · workspace 1')

assert.equal(model.digitWorkspaceId(0), 10)
assert.equal(model.digitWorkspaceId(5), 5)

assert.equal(model.viewCountLabel('workspaces', 6, 10, 10, ALL, ''), '6 workspaces · 10 windows')
assert.equal(model.viewCountLabel('windows', 6, 10, 10, ALL, ''), '10 windows')
assert.equal(model.viewCountLabel('workspaces', 1, 2, 10, { kind: 'workspace', id: 5 }, '', 'workspace 5'),
  '1 workspace · 2 of 10 · workspace 5')

assert.equal(model.workspaceChipLabel(record({ workspaceName: 'special:music' })), 'music')
assert.equal(model.workspaceChipLabel(record({ workspaceName: '6' })), '6')
assert.equal(model.workspaceChipLabel(record({ workspaceName: '', workspaceId: 4 })), '4')

// Workspace card composition: real geometry when every visible window has it.
const spatialWindows = [
  record({ key: 'left', workspaceId: 5 }),
  record({ key: 'right', workspaceId: 5 }),
  record({ key: 'tray', workspaceId: 5, minimized: true })
]
for (const item of spatialWindows) item.monitorRect = { x: 0, y: 0, width: 2560, height: 1440 }
spatialWindows[0].rect = { x: 0, y: 0, width: 1280, height: 1440 }
spatialWindows[1].rect = { x: 1280, y: 0, width: 1280, height: 1440 }
spatialWindows[2].rect = { x: 0, y: 0, width: 100, height: 100 }

const spatialLayout = model.workspaceLayout(spatialWindows)
assert.equal(spatialLayout[2].hidden, true, 'minimized windows stay out of the composite')
assert.deepEqual([spatialLayout[0].x, spatialLayout[0].width, spatialLayout[0].height], [0, 0.5, 1])
assert.deepEqual([spatialLayout[1].x, spatialLayout[1].width], [0.5, 0.5])

// liveSelected targets the first miniature that is actually drawn: a
// minimized MRU window must not swallow the stream.
assert.equal(model.firstShownIndex(spatialLayout), 0)
const minimizedFirst = model.workspaceLayout([
  record({ key: 'mru', workspaceId: 5, minimized: true }),
  record({ key: 'shown', workspaceId: 5 })
])
assert.equal(minimizedFirst[0].hidden, true)
assert.equal(model.firstShownIndex(minimizedFirst), 1)
assert.equal(model.firstShownIndex(model.workspaceLayout([record({ key: 'only', minimized: true })])), -1)
assert.equal(model.workspaceLayout([
  record({ key: 'mapped-minimized', workspaceId: -98, workspaceName: 'special:minimized' })
])[0].hidden, false, 'mapped windows on special:minimized can still provide previews when shown')
assert.equal(model.firstShownIndex([]), -1)

// Hidden entries must not consume selected-card capture slots: with a budget
// of one, the live target (index 1 behind a minimized MRU window) still
// holds ordinal 0 and therefore a capture slot.
assert.deepEqual(model.shownOrdinals(minimizedFirst), [-1, 0])
const liveTarget = model.firstShownIndex(minimizedFirst)
assert.equal(liveTarget, 1)
assert.ok(model.shownOrdinals(minimizedFirst)[liveTarget] < 1,
  'the live target is capture-allowed even with maxInitialCaptures: 1')
assert.deepEqual(model.shownOrdinals(spatialLayout), [0, 1, -1])
assert.deepEqual(model.shownOrdinals([]), [])

// Fallback tiling when geometry is missing.
const fallbackLayout = model.workspaceLayout([record({ key: 'x' }), record({ key: 'y' })])
assert.equal(fallbackLayout[0].hidden, false)
assert.ok(fallbackLayout[1].x > fallbackLayout[0].x, 'fallback tiles left to right')
assert.ok(Math.abs(fallbackLayout[0].width - fallbackLayout[1].width) < 1e-9, 'fallback tiles share one size')
assert.ok(fallbackLayout[0].width > 0 && fallbackLayout[0].height > 0)

const workspaceMru = [
  record({ key: 'w1', workspaceId: 6 }),
  record({ key: 'w2', workspaceId: 6 }),
  record({ key: 'w3', workspaceId: 5 }),
  record({ key: 'w4', workspaceId: 1 })
]
assert.equal(model.previousWorkspaceKey(workspaceMru, 6), '5',
  'the previous workspace is the most recent one that is not focused')
assert.equal(model.previousWorkspaceKey([record({ workspaceId: 6 })], 6), '')

// Grouped display order: regular workspaces ascending, specials after them,
// unassociated windows last, MRU preserved inside each workspace.
const mruOrdered = [
  record({ key: 'b', workspaceId: 2, workspaceName: '2' }),
  record({ key: 'c', workspaceId: -99, workspaceName: 'special:music' }),
  record({ key: 'a', workspaceId: 1, workspaceName: '1' }),
  record({ key: 'd', workspaceId: 1, workspaceName: '1' }),
  record({ key: 'e', workspaceId: null, workspaceName: '' })
]
const displayOrdered = model.orderByWorkspace(mruOrdered)
assert.deepEqual(displayOrdered.map(item => item.key), ['a', 'd', 'b', 'c', 'e'])

const recentOrdered = model.orderByWorkspace(mruOrdered, 'recent', ['2', '1', '-99'])
assert.deepEqual(recentOrdered.map(item => item.key), ['b', 'a', 'd', 'c', 'e'],
  'recent order follows workspace history and preserves window MRU inside each workspace')

const withMinimized = mruOrdered.concat([
  record({ key: 'm', workspaceId: -98, workspaceName: 'special:minimized', minimized: true })
])
assert.deepEqual(
  model.orderByWorkspace(withMinimized, 'recent', ['-98', '-99', '2', '1']).map(item => item.key),
  ['b', 'a', 'd', 'c', 'm', 'e'],
  'regular workspaces stay before special workspaces and minimized stays last')

assert.deepEqual(model.noteWorkspaceMru(['2', '1'], 7, 3), ['7', '2', '1'])
assert.deepEqual(model.noteWorkspaceMru(['7', '2', '1'], '2', 3), ['2', '7', '1'],
  'using a workspace moves it to the front without duplicates')
assert.deepEqual(model.noteWorkspaceMru(['2'], null, 3), ['2'],
  'a missing focused workspace is ignored')

const completedWorkspaceMru = model.completeWorkspaceMru(
  ['2'],
  [
    record({ key: 'current', workspaceId: 7 }),
    record({ key: 'older', workspaceId: 1 }),
    record({ key: 'duplicate', workspaceId: 7 }),
    record({ key: 'unassociated', workspaceId: null })
  ],
  7,
  10)
assert.deepEqual(completedWorkspaceMru, ['7', '2', '1'],
  'startup seeding puts the focused workspace first and fills gaps from window MRU')
assert.equal(model.previousWorkspaceKey(mruOrdered, 2, ['2', '1', '-99']), '1',
  'the previous workspace comes from workspace history when it is available')

const groups = model.groupWindows(displayOrdered)
assert.deepEqual(groups.map(group => [group.label, group.startIndex, group.size, group.totalSize]), [
  ['Workspace 1', 0, 2, 2],
  ['Workspace 2', 2, 1, 1],
  ['music', 3, 1, 1],
  ['No workspace', 4, 1, 1]
])
assert.deepEqual(model.groupWindows(displayOrdered, displayOrdered, { 1: 'Vision', 2: 'Research' })
  .map(group => group.label), ['Vision', 'Research', 'music', 'No workspace'],
  'local aliases replace regular workspace card and section labels only')
assert.deepEqual(model.groupWindows(displayOrdered, displayOrdered, { 1: 'Vision' })
  .map(group => group.defaultLabel), ['Workspace 1', 'Workspace 2', 'music', 'No workspace'],
  'groups retain alias-free labels so removing an alias does not require rebuilding cards')
const searchedGroups = model.groupWindows(
  displayOrdered.filter(item => item.key === 'a'), displayOrdered)
assert.equal(searchedGroups[0].size, 1, 'the card contains only search matches')
assert.equal(searchedGroups[0].totalSize, 2, 'the close confirmation counts the full workspace')
assert.equal(model.groupWindows(displayOrdered.slice(0, 2), [displayOrdered[0]])[0].totalSize, 2,
  'a supplied total cannot make the group count smaller than its visible size')
assert.equal(model.groupIndexFor(groups, 0), 0)
assert.equal(model.groupIndexFor(groups, 1), 0)
assert.equal(model.groupIndexFor(groups, 3), 2)
assert.equal(model.groupIndexFor(groups, 4), 3)

assert.equal(model.workspaceLabel(record({ workspaceName: 'special:music', monitorName: 'DP-2' })), 'music · DP-2')

const explicitHints = model.footerHints(model.VIEW_WINDOWS, model.ACTIVATION_EXPLICIT, 0)
assert.deepEqual(explicitHints.primary.map(hint => hint.keys.join('+')), ['Tab', 'Enter', 'Esc'],
  'explicit activation names the key that switches')
assert.deepEqual(
  model.footerHints(model.VIEW_WINDOWS, model.ACTIVATION_RELEASE, 0).primary.map(hint => hint.label),
  ['select', 'release to switch', 'cancel'],
  'release activation names the modifier instead of Enter')
assert.deepEqual(model.footerHints(model.VIEW_WINDOWS, model.ACTIVATION_RELEASE, 0).primary[1].keys,
  ['Alt/Meta/Super'],
  'release activation names the accepted modifier family rather than implying Alt is required')
assert.deepEqual(explicitHints.secondary.map(hint => hint.label),
  ['filter', 'workspace 10', 'all', 'group', 'workspaces'],
  'the window views omit the minimized hint when nothing is minimized')
assert.deepEqual(model.footerHints(model.VIEW_WINDOWS, model.ACTIVATION_EXPLICIT, 3)
  .secondary.map(hint => hint.label),
  ['filter', 'workspace 10', 'all', 'minimized', 'group', 'workspaces'],
  'the minimized hint follows the header control that owns it')
assert.deepEqual(model.footerHints(model.VIEW_WORKSPACES, model.ACTIVATION_EXPLICIT, 3)
  .secondary.map(hint => hint.label),
  ['rename', 'filter', 'workspace 10', 'minimized', 'order', 'windows'],
  'workspace view includes every visible session control')
assert.ok(model.footerHints(model.VIEW_GROUPED, model.ACTIVATION_EXPLICIT, 0)
  .secondary.every(hint => hint.label !== 'rename'),
  'only the workspace view offers renaming')
assert.deepEqual(model.footerHints(model.VIEW_GROUPED, model.ACTIVATION_EXPLICIT, 0)
  .secondary.map(hint => hint.label),
  ['filter', 'workspace 10', 'all', 'ungroup', 'order', 'workspaces'],
  'grouped view names the action that Ctrl+G performs and includes its visible order control')
assert.deepEqual(explicitHints.secondary[0].keys, ['Ctrl', '1…9'],
  'a shortcut is carried as separate caps so the footer can draw one per key')
assert.deepEqual(explicitHints.secondary.slice(0, 2).map(hint => hint.keys.join('+')),
  ['Ctrl+1…9', 'Ctrl+0'], 'the footer teaches the workspace 10 shortcut alongside workspaces 1 through 9')

console.log('ok - window switcher model')
