import QtQuick
import qs.Commons

// Shared selection shell for every window-bearing card. Keeping opacity,
// scale, stacking, ring, and border here makes the two card views hand off
// selection atomically and prevents their visual hierarchy from drifting.
Item {
  id: frame

  required property bool selected
  property Component selectedControl: null
  default property alias contentData: surface.data
  readonly property int contentInset: surface.border.width

  opacity: selected ? 1 : 0.7
  scale: selected ? 1.04 : 1
  z: selected ? 2 : 1

  Rectangle {
    anchors.fill: surface
    anchors.margins: -Style.space(3)
    visible: frame.selected
    radius: surface.radius > 0 ? surface.radius + Style.space(3) : 0
    color: "transparent"
    border.width: Math.max(1, Style.spacing.hairline)
    border.color: Util.alpha(Color.accent, 0.35)
    z: -1
  }

  Rectangle {
    id: surface

    anchors.fill: parent
    color: frame.selected ? Color.menu.selectedBackground : Color.menu.background
    radius: Style.cornerRadius
    border.width: Style.spacing.hairline
    border.color: Color.menu.border
    clip: true
  }

  // The selected border is painted over the surface instead of widening it.
  // `contentInset` follows surface.border.width and a card anchors its preview
  // to that inset, so thickening the real border resized the preview — which
  // changed ScreencopyView.constraintSize and forced a capture buffer to be
  // reallocated on both the newly and the previously selected card, on every
  // single Tab press. Width here is constant; only paint changes.
  Rectangle {
    anchors.fill: surface
    visible: frame.selected
    radius: surface.radius
    color: "transparent"
    border.width: Math.max(3, Style.spacing.hairline * 3)
    border.color: Color.accent
    z: 50
  }

  Loader {
    id: selectedControlLoader

    anchors.top: parent.top
    anchors.right: parent.right
    anchors.margins: Style.spacing.md
    sourceComponent: frame.selectedControl
    // Gated, not merely hidden: an always-active Loader builds a CloseButton
    // (Rectangle + Timer + MouseArea + Text) behind every card in the grid in
    // order to show exactly one of them.
    active: frame.selected
    visible: frame.selected
    z: 100
  }
}
