// Section delegates reach outward for `strip`, which is only defined behavior
// when instances are bound to their creation context.
pragma ComponentBehavior: Bound

import QtQuick
import qs.Commons
import "../model/Layouts.js" as Layouts

// Layout picker for the selected workspace card. It names its target
// workspace, because the pointer selects whichever card it crosses on the way
// down here.
Item {
  id: strip

  required property string targetLabel
  required property int windowCount
  required property real aspect
  required property string currentLayoutId
  required property bool fullscreenActive

  signal layoutPicked(string layoutId)
  signal fullscreenToggled()

  readonly property var sections: [
    { title: "Hyprland", group: Layouts.GROUP_TILING },
    { title: "Arrangements", group: Layouts.GROUP_ARRANGEMENT }
  ]

  implicitHeight: Math.max(targetColumn.implicitHeight, sectionsRow.implicitHeight)

  Column {
    id: targetColumn

    anchors.left: parent.left
    anchors.verticalCenter: parent.verticalCenter
    width: Style.space(120)
    spacing: Style.spacing.xxs

    Text {
      text: "Layout for"
      color: Util.alpha(Color.menu.text, 0.55)
      font.family: Style.font.family
      font.pixelSize: Style.font.caption
    }

    Text {
      width: parent.width
      text: strip.targetLabel
      elide: Text.ElideRight
      color: Color.menu.text
      font.family: Style.font.family
      font.pixelSize: Style.font.body
      font.weight: Font.DemiBold
    }
  }

  Flickable {
    id: scroller

    anchors {
      left: targetColumn.right
      leftMargin: Style.spacing.xxl
      right: parent.right
      top: parent.top
      bottom: parent.bottom
    }
    contentWidth: sectionsRow.implicitWidth
    contentHeight: height
    clip: true
    boundsBehavior: Flickable.StopAtBounds
    interactive: contentWidth > width

    Row {
      id: sectionsRow

      // Centered when it fits; scrolls from the left edge when it does not.
      x: Math.max(0, (scroller.width - implicitWidth) / 2)
      anchors.verticalCenter: parent.verticalCenter
      spacing: Style.spacing.xxl

      Repeater {
        model: strip.sections

        delegate: Row {
          id: section

          required property int index
          required property var modelData

          spacing: Style.spacing.xxl

          Rectangle {
            visible: section.index > 0
            anchors.verticalCenter: parent.verticalCenter
            width: Math.max(1, Style.spacing.hairline)
            height: sectionColumn.implicitHeight * 0.8
            color: Style.normalBorderColor
          }

          Column {
            id: sectionColumn

            spacing: Style.spacing.xs

            Text {
              text: section.modelData.title
              color: Util.alpha(Color.menu.text, 0.55)
              font.family: Style.font.family
              font.pixelSize: Style.font.caption
            }

            Row {
              spacing: Style.spacing.sm

              Repeater {
                model: Layouts.LAYOUTS.length

                delegate: LayoutThumb {
                  required property int index

                  visible: Layouts.LAYOUTS[index].group === section.modelData.group
                  layoutData: Layouts.LAYOUTS[index]
                  shortcutText: Layouts.shortcutKey(index)
                  windowCount: strip.windowCount
                  aspect: strip.aspect
                  current: Layouts.LAYOUTS[index].id === strip.currentLayoutId
                  onPicked: strip.layoutPicked(Layouts.LAYOUTS[index].id)
                }
              }
            }
          }
        }
      }

      Rectangle {
        anchors.verticalCenter: parent.verticalCenter
        width: Math.max(1, Style.spacing.hairline)
        height: windowColumn.implicitHeight * 0.8
        color: Style.normalBorderColor
      }

      // Acts on the workspace's most recent window rather than the layout.
      Column {
        id: windowColumn

        spacing: Style.spacing.xs

        Text {
          text: "Window"
          color: Util.alpha(Color.menu.text, 0.55)
          font.family: Style.font.family
          font.pixelSize: Style.font.caption
        }

        LayoutThumb {
          layoutData: Layouts.FULLSCREEN
          shortcutText: Layouts.FULLSCREEN.shortcut
          windowCount: 1
          aspect: strip.aspect
          current: strip.fullscreenActive
          onPicked: strip.fullscreenToggled()
        }
      }
    }
  }
}
