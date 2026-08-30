const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}

const manifest = JSON.parse(read('manifest.json'))
const switcher = read('Switcher.qml')
const card = read('components/WindowCard.qml')
const workspaceCard = read('components/WorkspaceCard.qml')
const workspaceGrid = read('components/WorkspaceGridView.qml')
const recordsSource = read('components/WindowRecords.qml')
const groupedView = read('components/GroupedListView.qml')
const viewArea = read('components/SwitcherViewArea.qml')
const keySurface = read('components/SwitcherKeySurface.qml')
const compositorSignals = read('components/CompositorSignals.qml')
const snapshotSource = read('model/WindowSnapshot.js')
const filterPill = read('components/FilterPill.qml')
const minimizedToggle = read('components/MinimizedToggle.qml')
const workspaceOrderToggle = read('components/WorkspaceOrderToggle.qml')
const switcherHeader = read('components/SwitcherHeader.qml')
const allQml = [switcher].concat(
  fs.readdirSync(path.join(root, 'components'))
    .filter(name => name.endsWith('.qml'))
    .map(name => read(path.join('components', name)))
).join('\n')

assert.equal(manifest.schemaVersion, 1)
assert.equal(manifest.id, 'community.window-switcher')
assert.deepEqual(manifest.kinds, ['overlay'])
assert.equal(manifest.keepLoaded, true)
assert.equal(manifest.entryPoints.overlay, 'Switcher.qml')

assert.match(switcher, /^Item \{/m, 'plugin entry point is an Item')
assert.match(switcher, /function open\(payloadJson\)/, 'plugin exposes open lifecycle')
assert.match(switcher, /function close\(\)/, 'plugin exposes close lifecycle')
assert.match(switcher, /function status\(\)/, 'plugin exposes runtime diagnostics')
assert.match(switcher, /hiddenMinimizedCount: hiddenMinimizedCount/, 'status reports the number hidden by the minimized toggle')
assert.match(switcher, /WlrLayershell\.keyboardFocus: root\.opened \? WlrKeyboardFocus\.Exclusive/, 'keyboard focus follows logical open state')
assert.match(switcher, /width: root\.opened \? panel\.width : 0/, 'closing animation releases the input region immediately')
assert.match(switcher, /WindowSnapshot\.reconcile\(allWindows, ordered\)/,
  'snapshot reconciliation decides when to preserve preview delegates')
assert.match(switcher, /var target = root\.pendingActivation/, 'activation waits for the overlay to finish closing')
assert.match(switcher, /function setFilter\(filter\)/, 'plugin exposes the workspace filter')
assert.match(switcher, /function setViewMode\(mode\)/, 'plugin exposes the view toggle')
assert.match(switcher, /function toggleMinimizedVisibility\(\)/, 'plugin exposes the minimized-window toggle')
assert.match(switcher, /function setWorkspaceOrder\(order\)/, 'plugin exposes the workspace-order toggle')
assert.match(switcher, /function setWorkspaceName\(workspaceId, name\)/,
  'workspace names are committed by stable compositor id')
assert.match(switcher, /workspaceGroupIndexForId\(renamingWorkspaceId\) < 0\)[\s\S]*?cancelWorkspaceRename\(\)/,
  'model refresh cancels an editor whose workspace disappeared')
assert.match(workspaceGrid, /renaming: Number\(workspaceCell\.modelData\.id\) === view\.renamingWorkspaceId/,
  'the inline editor follows its workspace when cards reorder')
assert.match(workspaceGrid, /cardRenameCommitted\(Number\(workspaceCell\.modelData\.id\), name\)/,
  'the commit signal carries a workspace id rather than a delegate index')
assert.doesNotMatch(allQml, /renamingWorkspaceIndex/,
  'workspace rename state never relies on a reactive model index')
assert.match(switcher, /if \(String\(query \|\| ""\)\.trim\(\)\)[\s\S]*?refreshFiltered/,
  'renaming only rebuilds workspace delegates when alias-aware search needs it')
assert.match(switcher, /shell\.updateEntryInline\(id, entry\)/,
  'workspace names persist through the host shell configuration API')
assert.match(switcher, /WindowModel\.groupWindows\(next, visibleAll, workspaceNames\)/,
  'workspace aliases feed card and grouped-section labels')
assert.match(switcher, /workspaceOrder: workspaceOrder/, 'status reports the active workspace order')
assert.match(switcher, /activeCaptureLimit: activeCaptureLimit/,
  'status exposes progressive capture state for runtime diagnosis')
assert.match(switcher,
  /WindowModel\.orderByWorkspace\(ordered, workspaceOrder, openWorkspaceMruKeys\)/,
  'section views use the frozen workspace history while the switcher is open')
assert.match(switcher, /openWorkspaceMruKeys = workspaceMruKeys\.slice\(\)/,
  'each opening freezes workspace history before cards are displayed')
assert.match(switcher, /WindowModel\.isMinimizedWindow\(includingMinimized\[hiddenIndex\]\)/,
  'the empty state counts all minimized matches that the toggle hides')
assert.match(switcher, /WindowModel\.pillRows\(/, 'header pills come from the tested model')
assert.match(switcher, /WindowModel\.viewCountLabel\(/, 'the count always reports against the total')
assert.match(switcher, /Hyprland\.refreshToplevels\(\)/, 'IPC geometry is refreshed rather than trusted stale')
assert.match(switcher, /\bSwitcherHeader\s*\{/, 'the header is its own component')
assert.match(switcher, /\bWindowRecords\s*\{/, 'record building is its own component')
assert.match(switcher, /\bSwitcherViewArea\s*\{/, 'the view area is its own component')
assert.match(switcher, /\bSwitcherKeySurface\s*\{/, 'the keymap is its own component')
assert.match(switcher, /\bCompositorSignals\s*\{/, 'compositor wiring is its own component')

assert.match(compositorSignals, /target: ToplevelManager\.toplevels/, 'window lifecycle is reactive')
assert.match(compositorSignals, /target: Hyprland/, 'Hyprland changes are reactive')
assert.match(compositorSignals, /signal workspaceFocusChanged\(var workspaceId\)/,
  'the compositor boundary exposes workspace focus events')
assert.match(compositorSignals, /workspaceFocusChanged\(workspace \? workspace\.id : null\)/,
  'workspace history receives the focused Hyprland workspace id')
assert.match(switcher, /root\.noteWorkspaceUsed\(record\.workspaceId\)/,
  'active windows also record special-workspace use')
assert.match(keySurface, /WindowModel\.digitWorkspaceId\(/, 'Ctrl+digit maps to workspace numbers')
assert.match(keySurface, /ctrl && event\.key === Qt\.Key_M/, 'Ctrl+M toggles minimized-window visibility')
assert.match(keySurface, /ctrl && event\.key === Qt\.Key_O/, 'Ctrl+O toggles workspace ordering')
assert.match(keySurface, /event\.key === Qt\.Key_F2/, 'F2 starts workspace renaming')
assert.match(keySurface, /Keys\.enabled: !surface\.editingWorkspaceName/,
  'the global switcher keymap yields to the inline name editor')
assert.match(minimizedToggle, /toggle\.showMinimized \? "Shown" : "Hidden"/, 'the minimized toggle names both states')
assert.match(minimizedToggle, /constrained: !toggle\.showMinimized/,
  'the minimized toggle takes the accent when it hides windows, never when it shows them')
assert.match(switcherHeader, /id: rightCluster[\s\S]*?MinimizedToggle \{/,
  'the minimized toggle sits with the view controls, not among the filter pills')
assert.ok(!/MinimizedToggle/.test(switcherHeader.slice(switcherHeader.indexOf('Flow {'))),
  'the filter row holds filter pills only, so nothing else can read as a selected filter')
assert.match(switcherHeader, /visible: header\.minimizedCount > 0/,
  'the minimized toggle stays out of the header when nothing is minimized')
assert.match(switcherHeader, /WorkspaceOrderToggle \{[\s\S]*?visible: header\.viewMode !== WindowModel\.VIEW_WINDOWS/,
  'workspace ordering is shown only for section views')
assert.match(workspaceOrderToggle, /text: "Recent"/, 'the order toggle names recent ordering without jargon')
assert.match(workspaceOrderToggle, /text: "Number"/, 'the order toggle names numeric ordering')
assert.match(switcher, /minimizedCount = WindowModel\.minimizedCount\(allWindows, showSpecialWorkspaces\)/,
  'the toggle counts against every window so it cannot vanish mid-search')
assert.match(allQml, /Minimized windows are hidden/, 'the empty state explains when minimized matches are hidden')
assert.match(switcher, /function closeWorkspaceWindows\(workspaceId\)/, 'workspace close-all goes through one path')
assert.match(switcher, /!showMinimized && WindowModel\.isMinimizedWindow\(record\)/,
  'close-all uses the same minimized visibility rule as filtering')
assert.match(switcher, /closeWorkspaceWindows\(group\.key === WindowModel\.NO_WORKSPACE_KEY \? null : group\.id\)/,
  'the card close-all routes through the shared unfiltered path')
assert.match(switcher, /WindowModel\.groupWindows\(next, visibleAll, workspaceNames\)/,
  'workspace groups retain full-scope counts under search')
assert.doesNotMatch(switcher, /filteredWindows\[i\]\.toplevel\.close|closeWorkspaceGroup[\s\S]{0,200}filteredWindows/, 'close-all never iterates the query-filtered list')
assert.match(card, /\bCloseButton\s*\{/, 'window cards expose a close button')
assert.match(workspaceCard, /\bCloseButton\s*\{/, 'workspace cards expose a close-all button')
assert.match(filterPill, /\bCloseButton\s*\{/, 'workspace pills expose a close-all button')
assert.match(workspaceCard, /requireConfirm: true/, 'card close-all needs a confirming second click')
assert.equal((workspaceCard.match(/acceptedButtons: Qt\.LeftButton \| Qt\.RightButton/g) || []).length, 2,
  'right-click starts workspace renaming from both the preview and metadata areas')
assert.equal((workspaceCard.match(/card\.handlePointerClick\(mouse\.button\)/g) || []).length, 2,
  'both workspace-card click areas share the same button handling')
assert.match(workspaceCard, /\bTextInput\s*\{/, 'workspace names are edited inline')
assert.match(workspaceCard, /card\.renameCommitted\(nameEditor\.text\)/,
  'Enter commits the inline workspace name')
assert.match(workspaceCard, /WindowModel\.workspaceAlias\(workspaceNames, groupData\.id\)/,
  'workspace labels react to aliases without replacing the card model')
assert.match(filterPill, /requireConfirm: true/, 'pill close-all needs a confirming second click')
assert.match(card, /Qt\.MiddleButton/, 'middle-click closes a window card')

assert.doesNotMatch(allQml, /\bShellRoot\s*\{/, 'plugin does not create another shell root')
assert.doesNotMatch(allQml, /\bProcess\s*\{/, 'plugin does not spawn commands')
assert.doesNotMatch(allQml, /hyprctl|bash\s+-c|execDetached/, 'plugin does not build compositor shell commands')

assert.match(snapshotSource, /left\.toplevel !== right\.toplevel/,
  'a different compositor window invalidates the snapshot')
assert.match(snapshotSource, /sameRect\(left\.monitorRect, right\.monitorRect\)/,
  'refreshed monitor geometry invalidates the snapshot')
assert.match(snapshotSource, /var RECORD_FIELDS = \[/,
  'visible metadata and state use one snapshot field set')
assert.doesNotMatch(compositorSignals, /"windowtitle"/, 'title-only events do not trigger discarded full-model rebuilds')
assert.match(compositorSignals, /readonly property var geometryEventNames:/,
  'geometry event names have one source of truth')
assert.match(compositorSignals, /refreshEventNames: geometryEventNames\.concat/,
  'refresh events extend the geometry event set')
assert.match(viewArea, /groupedLoader\.item\.reveal\(index\)/,
  'the grouped view owns card-level reveal behavior')
assert.match(groupedView, /function reveal\(globalIndex\)/,
  'grouped keyboard selection reveals the selected card')
assert.match(groupedView, /section\.revealGlobalIndex\(globalIndex\)/,
  'the selected workspace section reveals its card')
assert.match(groupedView, /Nav\.revealOffset\(/,
  'grouped scrolling uses the tested navigation model')
assert.doesNotMatch(recordsSource,
  /focusHistoryId:|hyprland: hyprland|desktopEntry:|screenNames:|maximized:|fullscreen:/,
  'window records omit unused fields')
assert.match(workspaceGrid, /\bWorkspaceCard\s*\{/, 'workspace view renders composite workspace cards')
assert.doesNotMatch(workspaceCard, /Behavior on (?:color|scale)/,
  'workspace selection handoff is atomic instead of showing two selected cards')
assert.doesNotMatch(card, /Behavior on (?:color|scale)/,
  'window selection handoff is atomic instead of showing two selected cards')

assert.match(card, /\bScreencopyView\s*\{/, 'cards use the native screencopy API')
assert.match(card, /active: card\.switcherOpen && card\.captureEnabled/, 'capture components are inactive while closed')
assert.match(card, /card\.windowData\.minimized !== true/, 'minimized window cards never create capture components')
assert.match(card, /captureSource: card\.switcherOpen/, 'capture sources clear when the switcher closes')
assert.match(card, /workspaceChip/, 'cards surface their workspace at a glance')

assert.match(workspaceCard, /\bScreencopyView\s*\{/, 'workspace cards compose native captures')
assert.match(workspaceCard, /captureSource: card\.switcherOpen && card\.captureEnabled/, 'workspace captures stop when the switcher closes')
assert.match(workspaceCard, /WindowModel\.workspaceLayout\(/, 'workspace geometry comes from the tested model')
assert.match(workspaceCard, /captureAllowed: shown &&/, 'hidden miniatures never open capture contexts')
assert.match(workspaceCard, /pendingCount: card\.groupData && card\.groupData\.totalSize/, 'close confirmation counts the full workspace under search')
assert.match(workspaceCard, /shownOrdinal >= 0 && shownOrdinal < card\.captureLimit/, 'selected-card budget counts drawn miniatures, not raw entries')
assert.match(workspaceCard, /WindowModel\.shownOrdinals\(/, 'capture ordinals come from the tested model')
assert.match(workspaceCard,
  /live: card\.previewMode === WindowModel\.PREVIEW_LIVE_SELECTED\s+&& card\.selected && miniWindow\.index === card\.liveIndex/,
  'liveSelected streams the first drawn miniature, not a hidden one')
assert.match(workspaceCard, /WindowModel\.firstShownIndex\(/, 'the live target comes from the tested model')
assert.match(switcher, /id: captureRamp[\s\S]*?activeCaptureLimit \+ 2/,
  'initial screencopy sources are attached in small batches')
assert.match(switcher, /if \(root\.activeCaptureLimit === 0\) root\.beginCaptureRamp\(\)/,
  'capture attachment waits for the compositor geometry refresh')
assert.match(switcher,
  /if \(opened\) \{[\s\S]*?previousPreviewMode[\s\S]*?previousMaxInitialCaptures[\s\S]*?if \(previewMode !== previousPreviewMode[\s\S]*?\|\| maxInitialCaptures !== previousMaxInitialCaptures\) beginCaptureRamp\(\)/,
  'repeated summons preserve capture progress unless capture settings change')

console.log('ok - window switcher plugin contract')
