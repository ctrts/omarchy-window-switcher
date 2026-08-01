import QtQuick
import Quickshell
import Quickshell.Wayland
import qs.Commons
import "../model/WindowSwitcherModel.js" as WindowModel

Item {
  id: card

  required property var windowData
  required property bool selected
  required property bool switcherOpen
  required property bool captureEnabled
  required property string previewMode
  required property int animationMs

  signal activateRequested()
  signal closeRequested()
  signal hovered()

  readonly property bool previewReady: previewLoader.item && previewLoader.item.hasContent === true
  readonly property color cardColor: selected ? Color.menu.selectedBackground : Color.menu.background
  readonly property color cardBorder: selected ? Color.accent : Color.menu.border

  scale: selected ? 1.025 : 1
  z: selected ? 2 : 1

  Behavior on scale {
    NumberAnimation {
      duration: card.animationMs
      easing.type: Easing.OutCubic
    }
  }

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

    Behavior on color {
      ColorAnimation { duration: card.animationMs }
    }

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

      Image {
        id: fallbackIcon

        anchors.centerIn: parent
        width: Math.min(parent.width, parent.height) * 0.30
        height: width
        source: card.windowData ? card.windowData.iconSource : ""
        fillMode: Image.PreserveAspectFit
        asynchronous: true
        smooth: true
        opacity: card.previewReady ? 0 : 0.82

        Behavior on opacity { NumberAnimation { duration: 100 } }
      }

      Loader {
        id: previewLoader

        anchors.fill: parent
        active: card.switcherOpen && card.captureEnabled && card.previewMode !== WindowModel.PREVIEW_NONE
          && card.windowData && card.windowData.minimized !== true
        asynchronous: false

        sourceComponent: Item {
          readonly property bool hasContent: captureView.hasContent

          ScreencopyView {
            id: captureView

            readonly property real sourceAspect: sourceSize.height > 0
              ? sourceSize.width / sourceSize.height : 1.6

            anchors.centerIn: parent
            width: Math.min(parent.width, parent.height * sourceAspect)
            height: Math.min(parent.height, parent.width / sourceAspect)
            captureSource: card.switcherOpen && card.windowData ? card.windowData.toplevel : null
            live: card.previewMode === WindowModel.PREVIEW_LIVE_SELECTED && card.selected
            paintCursor: false
            constraintSize: Qt.size(Math.max(1, width), Math.max(1, height))
            visible: hasContent
          }
        }
      }

      Rectangle {
        anchors.fill: parent
        color: "transparent"
        border.width: Style.spacing.hairline
        border.color: Util.alpha(Color.foreground, 0.12)
      }

      MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.LeftButton | Qt.MiddleButton
        cursorShape: Qt.PointingHandCursor
        z: 2
        onClicked: function(mouse) {
          if (mouse.button === Qt.MiddleButton) card.closeRequested()
          else card.activateRequested()
        }
      }

      Row {
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.margins: Style.spacing.md
        spacing: Style.spacing.xs
        z: 3

        CardBadge {
          visible: card.windowData && card.windowData.workspaceChip ? true : false
          text: card.windowData && card.windowData.workspaceChip ? card.windowData.workspaceChip : ""
          outlined: true
        }

        CardBadge {
          visible: card.windowData && (card.windowData.active || card.windowData.urgent || card.windowData.minimized)
          text: {
            if (!card.windowData) return ""
            if (card.windowData.urgent) return "Urgent"
            if (card.windowData.active) return "Active"
            return "Minimized"
          }
          fillColor: card.windowData && card.windowData.urgent
            ? Util.alpha(Color.urgent, 0.92)
            : Util.alpha(Color.background, 0.84)
        }
      }

      CloseButton {
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.margins: Style.spacing.md
        z: 4
        onCloseRequested: card.closeRequested()
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
        acceptedButtons: Qt.LeftButton | Qt.MiddleButton
        cursorShape: Qt.PointingHandCursor
        onClicked: function(mouse) {
          if (mouse.button === Qt.MiddleButton) card.closeRequested()
          else card.activateRequested()
        }
      }

      Image {
        id: appIcon

        anchors.left: parent.left
        anchors.leftMargin: Style.spacing.lg
        anchors.verticalCenter: parent.verticalCenter
        width: Style.space(34)
        height: width
        source: card.windowData ? card.windowData.iconSource : ""
        fillMode: Image.PreserveAspectFit
        asynchronous: true
        smooth: true
      }

      Item {
        anchors {
          left: appIcon.right
          leftMargin: Style.spacing.lg
          right: parent.right
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
          text: card.windowData ? card.windowData.title : ""
          color: card.selected ? Color.menu.selectedText : Color.menu.text
          font.family: Style.font.family
          font.pixelSize: Style.font.body
          font.weight: card.selected ? Font.DemiBold : Font.Medium
          elide: Text.ElideRight
          maximumLineCount: 1
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
            if (!card.windowData) return ""
            var app = card.windowData.appName || card.windowData.appId || "Application"
            var context = card.windowData.contextLabel || ""
            return context ? app + " · " + context : app
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
