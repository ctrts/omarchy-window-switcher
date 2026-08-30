import QtQuick
import Quickshell
import Quickshell.Wayland
import qs.Commons
import "../model/WindowSwitcherModel.js" as WindowModel

Item {
  id: card

  required property var groupData
  required property var windows
  required property bool selected
  required property bool focusedWorkspace
  required property bool switcherOpen
  required property bool captureEnabled
  required property string previewMode
  required property int firstWindowIndex
  required property int captureLimit
  required property var workspaceNames
  required property int animationMs
  required property bool renaming

  signal activateRequested()
  signal closeAllRequested()
  signal renameRequested()
  signal renameCommitted(string name)
  signal renameCancelled()
  signal hovered()

  readonly property var layout: WindowModel.workspaceLayout(windows)
  // The most recent window that is actually drawn; a minimized MRU window
  // must not swallow the liveSelected stream.
  readonly property int liveIndex: WindowModel.firstShownIndex(layout)
  readonly property var captureOrdinals: WindowModel.shownOrdinals(layout)
  readonly property real monitorAspect: {
    for (var i = 0; i < windows.length; i++) {
      var rect = windows[i] && windows[i].monitorRect ? windows[i].monitorRect : null
      if (rect && rect.width > 0 && rect.height > 0) return rect.width / rect.height
    }
    return 16 / 9
  }
  readonly property var frontWindow: windows.length > 0 ? windows[0] : null
  readonly property string workspaceLabel: {
    if (!groupData) return ""
    var alias = WindowModel.workspaceAlias(workspaceNames, groupData.id)
    return alias || String(groupData.defaultLabel || groupData.label || "")
  }
  // Distinct application icons, most recent first, so a card answers
  // "what lives here" without reading the previews.
  readonly property var appIcons: {
    var icons = []
    var seen = {}
    for (var i = 0; i < windows.length; i++) {
      var record = windows[i]
      if (!record || !record.iconSource) continue
      var key = String(record.appId || record.iconSource)
      if (seen[key]) continue
      seen[key] = true
      icons.push(record.iconSource)
      if (icons.length >= 4) break
    }
    return icons
  }
  readonly property color cardColor: selected ? Color.menu.selectedBackground : Color.menu.background
  readonly property color cardBorder: selected ? Color.accent : Color.menu.border

  function handlePointerClick(button) {
    if (button === Qt.RightButton) renameRequested()
    else activateRequested()
  }

  scale: selected ? 1.025 : 1
  z: selected ? 2 : 1

  HoverHandler {
    cursorShape: Qt.PointingHandCursor
    onHoveredChanged: if (hovered) card.hovered()
  }

  Rectangle {
    id: surface

    anchors.fill: parent
    color: card.cardColor
    radius: Style.cornerRadius
    border.width: card.selected ? Math.max(2, Style.spacing.hairline) : Style.spacing.hairline
    border.color: card.cardBorder
    clip: true

    Item {
      id: previewFrame

      anchors {
        top: parent.top
        left: parent.left
        right: parent.right
        bottom: metadata.top
      }
      anchors.margins: surface.border.width
      clip: true

      Rectangle {
        anchors.fill: parent
        color: Qt.darker(Color.menu.background, 1.18)
      }

      // The workspace canvas keeps the monitor's aspect ratio; each window is
      // drawn at its real position and size, most recently used on top.
      Item {
        id: workspaceSurface

        anchors.centerIn: parent
        width: Math.min(parent.width, parent.height * card.monitorAspect)
        height: Math.min(parent.height, parent.width / card.monitorAspect)

        Rectangle {
          anchors.fill: parent
          color: Qt.darker(Color.menu.background, 1.32)
          border.width: Style.spacing.hairline
          border.color: Util.alpha(Color.foreground, 0.10)
        }

        Repeater {
          model: card.windows.length

          delegate: Item {
            id: miniWindow

            required property int index
            readonly property var windowData: card.windows[index]
            readonly property var cell: index < card.layout.length ? card.layout[index] : null
            readonly property bool shown: cell !== null && cell.hidden !== true
            // The capture budget counts windows, not cards: unselected cards
            // share the global first-N budget by flat window index, and the
            // selected card may capture at most that budget on its own. The
            // selected card budgets by drawn-miniature ordinal so hidden
            // windows cannot starve the liveSelected target of its slot.
            readonly property int shownOrdinal: index < card.captureOrdinals.length ? card.captureOrdinals[index] : -1
            readonly property bool captureAllowed: shown && (card.selected
              ? shownOrdinal >= 0 && shownOrdinal < card.captureLimit
              : card.firstWindowIndex + index < card.captureLimit)
            visible: shown
            x: cell ? cell.x * workspaceSurface.width : 0
            y: cell ? cell.y * workspaceSurface.height : 0
            width: cell ? Math.max(1, cell.width * workspaceSurface.width) : 1
            height: cell ? Math.max(1, cell.height * workspaceSurface.height) : 1
            z: card.windows.length - index

            Rectangle {
              anchors.fill: parent
              color: Qt.darker(Color.menu.background, 1.08)
              border.width: Style.spacing.hairline
              border.color: Util.alpha(Color.foreground, 0.22)
            }

            ScreencopyView {
              id: miniCapture

              anchors.fill: parent
              anchors.margins: Style.spacing.hairline
              captureSource: card.switcherOpen && card.captureEnabled && miniWindow.captureAllowed
                && miniWindow.windowData ? miniWindow.windowData.toplevel : null
              live: card.previewMode === WindowModel.PREVIEW_LIVE_SELECTED
                && card.selected && miniWindow.index === card.liveIndex
              paintCursor: false
              constraintSize: Qt.size(Math.max(1, width), Math.max(1, height))
              visible: hasContent
            }

            Image {
              anchors.centerIn: parent
              width: Math.max(8, Math.min(parent.width, parent.height) * 0.4)
              height: width
              source: miniWindow.windowData ? miniWindow.windowData.iconSource : ""
              fillMode: Image.PreserveAspectFit
              asynchronous: true
              smooth: true
              visible: !miniCapture.hasContent
              opacity: 0.75
            }
          }
        }
      }

      CardBadge {
        visible: card.focusedWorkspace
        anchors.top: parent.top
        anchors.topMargin: Style.spacing.md
        anchors.right: closeAllButton.left
        anchors.rightMargin: Style.spacing.xs
        text: "Current"
        outlined: true
        z: 40
      }

      MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.LeftButton | Qt.RightButton
        enabled: !card.renaming
        cursorShape: Qt.PointingHandCursor
        z: 50
        onClicked: function(mouse) { card.handlePointerClick(mouse.button) }
      }

      CloseButton {
        id: closeAllButton

        anchors.top: parent.top
        anchors.right: parent.right
        anchors.margins: Style.spacing.md
        requireConfirm: true
        pendingCount: card.groupData && card.groupData.totalSize !== undefined
          ? card.groupData.totalSize : card.windows.length
        z: 60
        onCloseRequested: card.closeAllRequested()
      }
    }

    Item {
      id: metadata

      anchors {
        left: parent.left
        right: parent.right
        bottom: parent.bottom
      }
      height: Style.space(68)

      MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.LeftButton | Qt.RightButton
        enabled: !card.renaming
        cursorShape: Qt.PointingHandCursor
        onClicked: function(mouse) { card.handlePointerClick(mouse.button) }
      }

      Rectangle {
        id: numberChip

        anchors.left: parent.left
        anchors.leftMargin: Style.spacing.lg
        anchors.verticalCenter: parent.verticalCenter
        // Named workspaces (specials like "minimized") widen the chip to fit
        // their full name instead of truncating to two letters.
        width: Math.max(Style.space(34), numberChipLabel.implicitWidth + Style.spacing.controlPaddingX * 2)
        height: Style.space(34)
        radius: Style.cornerRadius
        color: Util.alpha(Color.accent, card.selected ? 0.28 : 0.14)
        border.width: Math.max(1, Style.spacing.hairline)
        border.color: Util.alpha(Color.accent, 0.55)

        Text {
          id: numberChipLabel

          anchors.centerIn: parent
          text: {
            if (!card.groupData) return ""
            if (card.groupData.key === WindowModel.NO_WORKSPACE_KEY) return "·"
            var id = Number(card.groupData.id)
            return isFinite(id) && id >= 0 ? String(id) : String(card.groupData.label)
          }
          color: card.selected ? Color.menu.selectedText : Color.menu.text
          font.family: Style.font.family
          font.pixelSize: Style.font.body
          font.weight: Font.DemiBold
        }
      }

      Row {
        id: iconStrip

        anchors.right: parent.right
        anchors.rightMargin: Style.spacing.lg
        anchors.verticalCenter: parent.verticalCenter
        spacing: Style.spacing.xs

        Repeater {
          model: card.appIcons

          delegate: Image {
            required property var modelData
            width: Style.space(20)
            height: width
            source: modelData
            fillMode: Image.PreserveAspectFit
            asynchronous: true
            smooth: true
          }
        }
      }

      Item {
        id: labelBlock

        anchors {
          left: numberChip.right
          leftMargin: Style.spacing.lg
          right: iconStrip.left
          rightMargin: Style.spacing.lg
          verticalCenter: parent.verticalCenter
        }
        height: titleLabel.implicitHeight + contextLabel.implicitHeight + Style.spacing.xs

        Text {
          id: titleLabel

          anchors {
            top: parent.top
            left: parent.left
            right: parent.right
          }
          text: card.workspaceLabel
          visible: !card.renaming
          color: card.selected ? Color.menu.selectedText : Color.menu.text
          font.family: Style.font.family
          font.pixelSize: Style.font.body
          font.weight: card.selected ? Font.DemiBold : Font.Medium
          elide: Text.ElideRight
          maximumLineCount: 1
        }

        TextInput {
          id: nameEditor

          anchors {
            top: parent.top
            left: parent.left
            right: parent.right
          }
          visible: card.renaming
          color: card.selected ? Color.menu.selectedText : Color.menu.text
          selectionColor: Util.alpha(Color.accent, 0.45)
          selectedTextColor: Color.menu.selectedText
          font.family: Style.font.family
          font.pixelSize: Style.font.body
          font.weight: Font.DemiBold
          maximumLength: 48
          selectByMouse: true
          clip: true

          onVisibleChanged: {
            if (!visible) return
            text = card.workspaceLabel
            Qt.callLater(function() {
              if (!card.renaming) return
              nameEditor.forceActiveFocus()
              nameEditor.selectAll()
            })
          }

          Keys.onPressed: function(event) {
            if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
              card.renameCommitted(nameEditor.text)
              event.accepted = true
            } else if (event.key === Qt.Key_Escape) {
              card.renameCancelled()
              event.accepted = true
            }
          }

          Rectangle {
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            height: Math.max(1, Style.spacing.hairline)
            color: Color.accent
          }
        }

        Text {
          id: contextLabel

          anchors {
            top: titleLabel.bottom
            topMargin: Style.spacing.xs
            left: parent.left
            right: parent.right
          }
          text: {
            var count = card.windows.length
            var total = card.groupData && card.groupData.totalSize !== undefined
              ? card.groupData.totalSize : count
            var result = count === total
              ? count + (count === 1 ? " window" : " windows")
              : count + " of " + total + " windows"
            var monitor = card.frontWindow && card.frontWindow.monitorName ? card.frontWindow.monitorName : ""
            return monitor ? result + " · " + monitor : result
          }
          color: Util.alpha(Color.menu.text, 0.68)
          font.family: Style.font.family
          font.pixelSize: Style.font.caption
          elide: Text.ElideRight
          maximumLineCount: 1
        }
      }
    }
  }
}
