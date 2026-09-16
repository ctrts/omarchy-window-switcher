// Cell delegates reach outward for `thumb`, which is only defined behavior
// when instances are bound to their creation context.
pragma ComponentBehavior: Bound

import QtQuick
import qs.Commons
import "../model/Layouts.js" as Layouts

// One layout choice: a schematic of the workspace's windows in that layout,
// the Alt+digit cap that applies it, and its name.
Rectangle {
  id: thumb

  required property var layoutData
  required property string shortcutText
  required property int windowCount
  required property real aspect
  required property bool current

  signal picked()

  readonly property var cells: layoutData.id === Layouts.FULLSCREEN.id
    ? Layouts.fullscreenPreviewRects()
    : Layouts.previewRects(layoutData.id, windowCount, aspect)
  readonly property bool hot: pointer.containsMouse

  // Wide enough for its label, so neighbouring names never run together.
  implicitWidth: Math.max(Style.space(78), labelRow.implicitWidth + Style.spacing.md * 2)
  implicitHeight: content.implicitHeight + Style.spacing.md * 2
  radius: Style.cornerRadius
  color: current ? Style.selectedAccentFill : (hot ? Style.hoverFill : "transparent")
  border.width: Math.max(1, Style.spacing.hairline)
  border.color: current ? Color.accent : (hot ? Style.hoverBorderColor : "transparent")

  Column {
    id: content

    anchors.centerIn: parent
    spacing: Style.spacing.sm

    Item {
      id: canvas

      anchors.horizontalCenter: parent.horizontalCenter
      // Same size in every thumbnail, however long its label.
      width: Style.space(78) - Style.spacing.md * 2
      height: Math.round(width / Math.max(1.2, Math.min(2.2, thumb.aspect)))

      Rectangle {
        anchors.fill: parent
        color: Qt.darker(Color.menu.background, 1.32)
        border.width: Style.spacing.hairline
        border.color: Util.alpha(Color.foreground, 0.10)
      }

      Repeater {
        model: thumb.cells

        delegate: Rectangle {
          required property int index
          required property var modelData
          readonly property real gap: Math.max(1, Style.spacing.xxs)

          x: modelData.x * canvas.width + gap
          y: modelData.y * canvas.height + gap
          width: Math.max(1, modelData.width * canvas.width - gap * 2)
          height: Math.max(1, modelData.height * canvas.height - gap * 2)
          // The main window reads as the one the layout is organized around.
          color: index === 0 && (thumb.layoutData.family === "master" || thumb.layoutData.family === "fullscreen")
            ? Util.alpha(Color.accent, thumb.current ? 0.55 : 0.38)
            : Util.alpha(Color.foreground, thumb.current ? 0.32 : 0.20)
          border.width: Style.spacing.hairline
          border.color: Util.alpha(Color.foreground, 0.35)
        }
      }
    }

    Row {
      id: labelRow

      anchors.horizontalCenter: parent.horizontalCenter
      spacing: Style.spacing.xs

      KeyCap {
        anchors.verticalCenter: parent.verticalCenter
        text: thumb.shortcutText
        visible: text !== ""
      }

      Text {
        anchors.verticalCenter: parent.verticalCenter
        text: thumb.layoutData.label
        color: thumb.current ? Color.menu.text : Util.alpha(Color.menu.text, 0.72)
        font.family: Style.font.family
        font.pixelSize: Style.font.caption
        font.weight: thumb.current ? Font.DemiBold : Font.Normal
      }
    }
  }

  MouseArea {
    id: pointer

    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onClicked: thumb.picked()
  }
}
