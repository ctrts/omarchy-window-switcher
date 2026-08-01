import QtQuick
import qs.Commons

// Compact close affordance shared by window cards, workspace cards, and
// workspace pills. With requireConfirm the first click only arms the button
// — it fills red and shows how many windows are affected — and a second
// click within the timeout actually closes; leaving the button disarms it.
Rectangle {
  id: button

  property int size: Style.space(22)
  property bool requireConfirm: false
  property int pendingCount: 0
  property bool armed: false

  signal closeRequested()

  width: armed && pendingCount > 0 ? glyph.implicitWidth + Style.spacing.controlPaddingX * 2 : size
  height: size
  radius: Math.min(Style.cornerRadius, height / 2)
  color: armed || closeArea.containsMouse ? Util.alpha(Color.urgent, 0.95) : Util.alpha(Color.background, 0.88)
  border.width: Math.max(1, Style.spacing.hairline)
  border.color: armed || closeArea.containsMouse ? Color.urgent : Util.alpha(Color.urgent, 0.65)

  Timer {
    id: disarm

    interval: 2000
    onTriggered: button.armed = false
  }

  Text {
    id: glyph

    anchors.centerIn: parent
    text: button.armed && button.pendingCount > 0 ? "×" + button.pendingCount : "×"
    color: button.armed || closeArea.containsMouse ? Color.foreground : Color.urgent
    font.family: Style.font.family
    font.pixelSize: Math.max(10, Math.round(button.size * 0.68))
    font.weight: Font.Bold
  }

  MouseArea {
    id: closeArea

    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onClicked: function(mouse) {
      mouse.accepted = true
      if (button.requireConfirm && !button.armed) {
        button.armed = true
        disarm.restart()
        return
      }
      button.armed = false
      disarm.stop()
      button.closeRequested()
    }
    onContainsMouseChanged: {
      if (!containsMouse && button.armed) {
        button.armed = false
        disarm.stop()
      }
    }
  }
}
