import QtQuick
import qs.Commons
import "../model/WindowSwitcherModel.js" as WindowModel

// One entry of the filter row: the All pill, a workspace pill with its
// window count, or (multi-monitor only) a plain monitor label.
Rectangle {
  id: pill

  required property var modelData
  required property var activeFilter

  signal allPicked()
  signal workspaceToggled(var workspaceId)
  signal closeAllRequested(var workspaceId)

  readonly property bool isLabel: modelData.type === WindowModel.PILL_LABEL
  readonly property bool active: modelData.type === WindowModel.PILL_ALL
    ? activeFilter.kind === WindowModel.FILTER_ALL
    : modelData.type === WindowModel.PILL_WORKSPACE
      && activeFilter.kind === WindowModel.FILTER_WORKSPACE
      && Number(activeFilter.id) === Number(modelData.id)

  width: pillContent.implicitWidth + (isLabel ? 0 : Style.spacing.controlPaddingX * 2)
  height: Style.spacing.controlHeight
  radius: Math.min(Style.cornerRadius, height / 2)
  color: isLabel ? "transparent" : (active ? Color.menu.selectedBackground : Style.normalFill)
  border.width: isLabel ? 0 : (active ? Math.max(1, Style.selectedBorderWidth) : Style.normalBorderWidth)
  border.color: active ? Color.accent : Style.normalBorderColor

  Row {
    id: pillContent

    // Raised above the pill's own MouseArea sibling so the close button can
    // take its clicks; text does not grab mouse, so pill clicks still work.
    z: 1
    anchors.centerIn: parent
    spacing: Style.spacing.xs

    Rectangle {
      visible: pill.modelData.focused === true
      width: Style.space(6)
      height: width
      radius: width / 2
      color: Color.accent
      anchors.verticalCenter: parent.verticalCenter
    }

    Rectangle {
      // A workspace holding an urgent window flags it from anywhere.
      visible: pill.modelData.urgent === true
      width: Style.space(6)
      height: width
      radius: width / 2
      color: Color.urgent
      anchors.verticalCenter: parent.verticalCenter
    }

    Text {
      text: pill.modelData.label
      color: pill.isLabel ? Util.alpha(Color.menu.text, 0.56)
        : pill.active ? Color.menu.selectedText : Color.menu.text
      font.family: Style.font.family
      font.pixelSize: pill.isLabel ? Style.font.caption : Style.font.title
      font.weight: pill.isLabel ? Font.Normal : Font.Bold
      anchors.verticalCenter: parent.verticalCenter
    }

    Text {
      // The count keeps a hue of its own so it can never be misread as part
      // of the workspace number: dim accent beside a bright number, dim grey
      // when the active pill's number is already accent-colored.
      visible: pill.modelData.count !== undefined
      text: pill.modelData.count !== undefined ? String(pill.modelData.count) : ""
      color: pill.active
        ? Util.alpha(Color.menu.text, 0.55)
        : Util.alpha(Color.accent, 0.80)
      font.family: Style.font.family
      font.pixelSize: Math.max(8, Style.font.caption - 2)
      anchors.verticalCenter: parent.verticalCenter
    }

    CloseButton {
      visible: pill.modelData.type === WindowModel.PILL_WORKSPACE
      size: Style.space(18)
      requireConfirm: true
      pendingCount: pill.modelData.count !== undefined ? pill.modelData.count : 0
      anchors.verticalCenter: parent.verticalCenter
      onCloseRequested: pill.closeAllRequested(pill.modelData.id)
    }
  }

  MouseArea {
    anchors.fill: parent
    enabled: !pill.isLabel
    hoverEnabled: true
    cursorShape: pill.isLabel ? Qt.ArrowCursor : Qt.PointingHandCursor
    onClicked: {
      if (pill.modelData.type === WindowModel.PILL_ALL) pill.allPicked()
      else pill.workspaceToggled(pill.modelData.id)
    }
  }
}
