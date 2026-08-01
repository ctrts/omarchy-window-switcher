import QtQuick
import qs.Commons
import "../model/WindowSwitcherModel.js" as WindowModel

// One composite card per workspace; the model is the group list and
// `windows` is the flat workspace-ordered record list the groups index into.
GridView {
  id: view

  required property var windows
  required property var metrics
  required property int selectedIndex
  required property int focusedWorkspaceId
  required property bool switcherOpen
  required property string previewMode
  required property int captureLimit
  required property int animationMs

  signal cardHovered(int index)
  signal cardActivated(int index)
  signal cardCloseAllRequested(int index)

  // Rows hug their cards; the whole block centers vertically when it fits.
  readonly property int rowCount: Math.ceil(Math.max(0, count) / Math.max(1, metrics.columns))

  clip: true
  cellWidth: metrics.cellWidth
  cellHeight: metrics.cellHeight
  topMargin: Math.max(0, Math.floor((height - rowCount * cellHeight) / 2))
  currentIndex: selectedIndex
  boundsBehavior: Flickable.StopAtBounds
  interactive: contentHeight > height
  highlightFollowsCurrentItem: false
  cacheBuffer: height

  delegate: Item {
    id: workspaceCell

    required property int index
    required property var modelData
    width: view.cellWidth
    height: view.cellHeight

    WorkspaceCard {
      anchors.centerIn: parent
      width: Math.max(1, Math.min(view.metrics.cardWidth, parent.width - Style.spacing.xxl))
      height: Math.max(1, Math.min(view.metrics.cardHeight, parent.height - Style.spacing.xxl))
      groupData: workspaceCell.modelData
      windows: view.windows.slice(
        workspaceCell.modelData.startIndex,
        workspaceCell.modelData.startIndex + workspaceCell.modelData.size)
      selected: workspaceCell.index === view.selectedIndex
      focusedWorkspace: Number(workspaceCell.modelData.id) === view.focusedWorkspaceId
      switcherOpen: view.switcherOpen
      captureEnabled: view.switcherOpen && view.previewMode !== WindowModel.PREVIEW_NONE
      previewMode: view.previewMode
      firstWindowIndex: workspaceCell.modelData.startIndex
      captureLimit: view.captureLimit
      animationMs: view.animationMs
      onHovered: view.cardHovered(workspaceCell.index)
      onActivateRequested: view.cardActivated(workspaceCell.index)
      onCloseAllRequested: view.cardCloseAllRequested(workspaceCell.index)
    }
  }
}
