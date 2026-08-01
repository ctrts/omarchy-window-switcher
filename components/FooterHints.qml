import QtQuick
import QtQuick.Layouts
import qs.Commons
import "../model/WindowSwitcherModel.js" as WindowModel

// Bottom hint row: interaction summary, shortcut reference, preview state.
RowLayout {
  id: footer

  required property string activationMode
  required property string previewMode

  spacing: Style.spacing.controlGap

  Text {
    Layout.fillWidth: true
    text: footer.activationMode === WindowModel.ACTIVATION_RELEASE
      ? "Tab/arrows select · release modifier to switch · Escape cancels"
      : "Tab/arrows select · Enter switches · Escape cancels"
    color: Util.alpha(Color.menu.text, 0.60)
    font.family: Style.font.family
    font.pixelSize: Style.font.caption
    elide: Text.ElideRight
  }

  Text {
    text: "Ctrl+1…9 filter · Ctrl+A all · Ctrl+M minimized · Ctrl+O order · Ctrl+W workspaces"
    color: Util.alpha(Color.menu.text, 0.60)
    font.family: Style.font.family
    font.pixelSize: Style.font.caption
  }

  Text {
    text: footer.previewMode === WindowModel.PREVIEW_NONE
      ? "Previews off"
      : (footer.previewMode === WindowModel.PREVIEW_LIVE_SELECTED
        ? "Selected preview live" : "Still previews")
    color: Util.alpha(Color.menu.text, 0.60)
    font.family: Style.font.family
    font.pixelSize: Style.font.caption
  }
}
