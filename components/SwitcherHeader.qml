import QtQuick
import QtQuick.Layouts
import qs.Commons
import "../model/WindowSwitcherModel.js" as WindowModel

// Switcher header: title and search box on the left, the view controls and
// count pinned to the right edge, and the full-width filter pills below. The
// split is by class, not by convenience — the right edge holds the controls
// that decide what the list may contain, the row below holds the ones that
// pick which part of it to show.
ColumnLayout {
  id: header

  required property var pillRows
  required property var activeFilter
  required property bool showMinimized
  required property int minimizedCount
  required property string viewMode
  required property string workspaceOrder
  required property string countText
  required property string query

  signal allPicked()
  signal minimizedToggleRequested()
  signal workspaceOrderRequested(string order)
  signal workspaceToggled(var workspaceId)
  signal workspaceCloseRequested(var workspaceId)
  signal windowsViewRequested()
  signal workspacesViewRequested()

  spacing: Style.spacing.md

  // Anchors instead of nested layouts: the right cluster stays glued to the
  // right edge no matter how the search box sizes itself.
  Item {
    Layout.fillWidth: true
    implicitHeight: Math.max(titleBlock.implicitHeight, rightCluster.implicitHeight)

    Column {
      id: titleBlock

      anchors.left: parent.left
      anchors.right: rightCluster.left
      anchors.rightMargin: Style.spacing.controlGap
      anchors.verticalCenter: parent.verticalCenter
      spacing: Style.spacing.xs

      Text {
        text: "Switch windows"
        color: Color.menu.text
        font.family: Style.font.family
        font.pixelSize: Style.font.title
        font.weight: Font.DemiBold
      }

      Rectangle {
        width: Math.max(1, Math.min(Style.space(420), titleBlock.width))
        height: Style.spacing.controlHeight
        radius: Style.cornerRadius
        color: Style.normalFill
        border.width: Style.normalBorderWidth
        border.color: header.query ? Color.accent : Style.normalBorderColor

        Item {
          anchors.fill: parent
          anchors.leftMargin: Style.spacing.controlPaddingX
          anchors.rightMargin: Style.spacing.controlPaddingX

          Text {
            id: searchPrefix

            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            text: "/"
            color: header.query ? Color.accent : Util.alpha(Color.menu.text, 0.45)
            font.family: Style.font.family
            font.pixelSize: Style.font.body
          }

          Text {
            anchors.left: searchPrefix.right
            anchors.leftMargin: Style.spacing.xs
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            text: header.query ? header.query : "Type to filter by application or title"
            color: header.query ? Color.menu.text : Util.alpha(Color.menu.text, 0.5)
            font.family: Style.font.family
            font.pixelSize: Style.font.body
            elide: Text.ElideRight
          }
        }
      }
    }

    Row {
      id: rightCluster

      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      spacing: Style.spacing.controlGap

      MinimizedToggle {
        // A session with nothing minimized has nothing for this to do, so it
        // stays out of the way entirely rather than sitting there inert.
        visible: header.minimizedCount > 0
        anchors.verticalCenter: parent.verticalCenter
        showMinimized: header.showMinimized
        onToggleRequested: header.minimizedToggleRequested()
      }

      WorkspaceOrderToggle {
        visible: header.viewMode !== WindowModel.VIEW_WINDOWS
        anchors.verticalCenter: parent.verticalCenter
        workspaceOrder: header.workspaceOrder
        onRecentRequested: header.workspaceOrderRequested(WindowModel.WORKSPACE_ORDER_RECENT)
        onNumberRequested: header.workspaceOrderRequested(WindowModel.WORKSPACE_ORDER_NUMBER)
      }

      ViewToggle {
        anchors.verticalCenter: parent.verticalCenter
        viewMode: header.viewMode
        onWindowsRequested: header.windowsViewRequested()
        onWorkspacesRequested: header.workspacesViewRequested()
      }

      Text {
        anchors.verticalCenter: parent.verticalCenter
        text: header.countText
        color: Util.alpha(Color.menu.text, 0.64)
        font.family: Style.font.family
        font.pixelSize: Style.font.caption
      }
    }
  }

  Flow {
    Layout.fillWidth: true
    spacing: Style.spacing.controlGap

    Repeater {
      model: header.pillRows

      delegate: FilterPill {
        activeFilter: header.activeFilter
        onAllPicked: header.allPicked()
        onWorkspaceToggled: function(workspaceId) { header.workspaceToggled(workspaceId) }
        onCloseAllRequested: function(workspaceId) { header.workspaceCloseRequested(workspaceId) }
      }
    }
  }
}
