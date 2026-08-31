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
const cardFrame = read('components/CardFrame.qml')
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
const workspaceNamesReset = read('components/WorkspaceNamesReset.qml')
const switcherHeader = read('components/SwitcherHeader.qml')
const closeButton = read('components/CloseButton.qml')
const footerHints = read('components/FooterHints.qml')
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
assert.match(switcher, /function resetWorkspaceNames\(\)/,
  'the switcher exposes one path for restoring every default workspace name')
assert.match(switcher,
  /function resetWorkspaceNames\(\)[\s\S]*?workspaceNames = WindowModel\.normalizeWorkspaceNames\(\{\}\)[\s\S]*?workspaceNamesDirty = true/,
  'resetting names clears the aliases and marks their persisted settings dirty')
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
assert.match(switcherHeader,
  /WorkspaceNamesReset\s*\{[\s\S]*?visible: header\.viewMode === WindowModel\.VIEW_WORKSPACES[\s\S]*?nameCount: header\.workspaceNameCount/,
  'the reset option appears only beside workspace controls when aliases exist')
assert.match(switcher, /workspaceNameCount: root\.workspaceNameCount/,
  'the header receives the live number of custom workspace names')
assert.match(switcher, /onWorkspaceNamesResetRequested: root\.resetWorkspaceNames\(\)/,
  'the header reset action reaches the persisted workspace-name state')
assert.match(workspaceNamesReset, /if \(!button\.armed\)[\s\S]*?button\.armed = true[\s\S]*?return[\s\S]*?button\.resetRequested\(\)/,
  'resetting every name requires a confirming second click')
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
assert.match(cardFrame, /required property bool selected/,
  'the shared card frame owns selection state')
assert.match(cardFrame, /opacity: selected \? 1 : 0\.7[\s\S]*?scale: selected \? 1\.04 : 1/,
  'the shared frame owns the selected-card visual hierarchy')
assert.match(card, /^CardFrame \{/m, 'window cards use the shared selection frame')
assert.match(workspaceCard, /^CardFrame \{/m, 'workspace cards use the shared selection frame')
assert.doesNotMatch(card + workspaceCard, /anchors\.fill: surface|readonly property color cardColor/,
  'card types do not duplicate the shared ring or surface chrome')

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
assert.match(switcher,
  /openingOverrides = WindowModel\.mergeInvocationOverrides\([\s\S]*?settingsKey === appliedSettingsKey\) \{[\s\S]*?selectAdjacent\(options\.direction\)[\s\S]*?return\s+\}/,
  'direction-only repeated summons move selection without rebuilding workspace delegates when settings are unchanged')
assert.match(switcher,
  /WindowModel\.effectiveOptions\(settings, \{\}\)[\s\S]*?openingOverrides[\s\S]*?invocation\.direction = payload\.direction/,
  'stored settings invalidate the fast path separately from opening-scoped invocation overrides')

// ------------------------------------------------------------ hierarchy
//
// The switcher's verb is "switch". Every rule below keeps the destructive
// controls, the chrome, and the selection state in that order of loudness.

assert.match(closeButton, /color: hot \? Util\.alpha\(Color\.urgent[\s\S]*?: Util\.alpha\(Color\.background/,
  'the close button rests in neutral chrome and only turns urgent under the pointer')
assert.match(cardFrame, /id: selectedControlLoader[\s\S]*?visible: frame\.selected/,
  'the shared frame reveals destructive controls only while selected')
assert.match(card, /selectedControl: CloseButton[\s\S]{0,200}?onCloseRequested: card\.closeRequested\(\)/,
  'a window card supplies its close action to the shared frame')
assert.match(workspaceCard, /selectedControl: CloseButton[\s\S]{0,400}?onCloseRequested: card\.closeAllRequested\(\)/,
  'a workspace card supplies its close-all action to the shared frame')
assert.doesNotMatch(card + workspaceCard, /visible: card\.selected/,
  'card types do not duplicate selected-only control visibility')
assert.match(cardFrame, /opacity: selected \? 1 : 0\.7/,
  'the shared frame makes every unselected card recede consistently')
assert.doesNotMatch(allQml, /Behavior on opacity[\s\S]{0,120}?selected/,
  'the selection dim is atomic, like every other selection signal')

// -------------------------------------------------- workspace miniatures
//
// Miniatures are drawn at real compositor geometry, so each one is the only
// honest target for the window it draws.

assert.match(workspaceCard, /signal windowActivateRequested\(int windowIndex\)/,
  'a workspace miniature activates the window it draws')
assert.match(workspaceCard, /signal windowCloseRequested\(int windowIndex\)/,
  'a workspace miniature closes the window it draws')
assert.match(workspaceCard, /card\.windowActivateRequested\(miniWindow\.index\)/,
  'the miniature reports its own local index')
assert.match(workspaceGrid, /view\.cardWindowActivated\(workspaceCell\.modelData\.startIndex \+ windowIndex\)/,
  'the grid turns a card-local miniature index into a flat window index')
assert.match(workspaceGrid, /view\.cardWindowCloseRequested\(workspaceCell\.modelData\.startIndex \+ windowIndex\)/,
  'miniature close requests carry the same flat window index')
assert.match(switcher, /function activateWindowAt\(index\)/,
  'the plugin can activate one window by flat index, not only the selected card')
assert.match(switcher, /function closeWindowAt\(index\)/,
  'the plugin can close one window by flat index')
assert.match(workspaceCard, /card\.hoveredWindow = miniWindow\.index[\s\S]*?if \(!card\.selected\) card\.hovered\(\)/,
  'a miniature that takes the hover re-asserts card selection, which it stole')

const canvasZ = /acceptedButtons: Qt\.LeftButton \| Qt\.RightButton[\s\S]*?z: (\d+)/.exec(workspaceCard)
const surfaceZ = /id: workspaceSurface[\s\S]*?z: (\d+)/.exec(workspaceCard)
const selectedControlZ = /id: selectedControlLoader[\s\S]*?z: (\d+)/.exec(cardFrame)
assert.ok(canvasZ && surfaceZ && selectedControlZ, 'workspace card stacking is stated, not implied')
assert.ok(Number(surfaceZ[1]) > Number(canvasZ[1]),
  'miniatures sit above the canvas click area or they can never be clicked')
assert.ok(Number(selectedControlZ[1]) > Number(surfaceZ[1]),
  'the shared selected control stays reachable above workspace miniatures')

assert.match(workspaceCard, /visible: miniCapture\.hasContent\s*\n\s*&& miniWindow\.width >=/,
  'a captured miniature still carries an identity chip, sized out only where it cannot fit')
assert.doesNotMatch(workspaceCard, /id: iconStrip/,
  'per-miniature icons replace the card-level icon strip rather than doubling it')
assert.match(workspaceCard, /id: hoverBand[\s\S]*?card\.hoveredRecord\.title/,
  'the pointed window is named in one fixed place, not inside a thumbnail')
assert.match(workspaceCard, /onSwitcherOpenChanged: if \(!switcherOpen\) hoveredWindow = -1/,
  'a closed overlay forgets what the pointer was over; delegates outlive a summon')
assert.match(workspaceCard, /id: currentSlot[\s\S]*?text: "Current"/,
  'the focused-workspace marker sits on the label bar, clear of the preview')

// ------------------------------------------------------------- the keymap

assert.match(footerHints, /WindowModel\.footerHints\(/, 'footer legends come from the tested model')
assert.match(footerHints, /\bKeyHint\s*\{\}/, 'the footer draws keys as caps rather than a run-on sentence')
assert.match(footerHints, /id: secondarySlot[\s\S]*?visible: footer\.width >=/,
  'the secondary legends yield the row instead of clipping')
assert.match(footerHints, /implicitWidth: secondaryHints\.implicitWidth/,
  'the measured row never hides itself, so the fit test cannot oscillate')
assert.match(filterPill, /\bKeyCap\s*\{/,
  'a workspace that answers to Ctrl+digit wears the same cap the footer draws')
assert.match(filterPill, /WindowModel\.workspaceShortcutKey\(modelData\.id, modelData\.label\)/,
  'workspace pills use the tested digit-to-workspace shortcut mapping')
assert.match(filterPill, /text: pill\.shortcutKey/,
  'the workspace 10 pill draws its shortcut key 0 rather than its workspace id')
assert.match(filterPill, /id: countChip/,
  'the window count wears a filled chip so it cannot be read as another digit')
assert.match(filterPill, /opacity: pillArea\.containsMouse \|\| pillClose\.hot \? 1 : 0/,
  'the pill close button is revealed under the pointer without reflowing the row')

// -------------------------------------------------------- the search field

assert.match(switcherHeader, /required property bool switcherOpen/,
  'the header names its lifecycle state consistently with the component tree')
assert.doesNotMatch(switcherHeader, /required property bool active/,
  'the header lifecycle cannot be confused with active filters or windows')
assert.match(switcherHeader, /id: caret[\s\S]*?running: header\.switcherOpen/,
  'the caret blinks only while the switcher is open; this plugin stays loaded')
assert.match(switcher, /SwitcherHeader\s*\{[\s\S]*?switcherOpen: root\.opened/,
  'the root supplies the header lifecycle explicitly')
assert.match(switcherHeader, /onClicked: header\.queryCleared\(\)/,
  'the query has a pointer way out, not only Escape')
assert.match(switcherHeader, /cursorShape: Qt\.IBeamCursor/,
  'the field admits it is a text field rather than promising a click target')
assert.match(switcher, /onQueryCleared: root\.updateQuery\(""\)/,
  'clearing the query goes through the one query path')

console.log('ok - window switcher plugin contract')
