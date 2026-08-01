# Window switching

This context defines the runtime terms for window selection and preview reuse.

## Language

**Window Record**:
A plain description of one compositor window that the switcher can show.
_Avoid_: Row, item

**Window Snapshot**:
An ordered set of window records that describes one visible switcher state.
_Avoid_: Window list, model snapshot

**Capture Delegate**:
A QML item that owns one window preview and its screencopy context.
_Avoid_: Preview object

## Relationships

- A **Window Snapshot** supplies **Window Records** to **Capture Delegates**.
- A title-only update keeps the current **Window Snapshot** and its **Capture Delegates**.
- Any other tracked field replaces the **Window Snapshot**.

## Example dialogue

> **Developer:** "Does a title change replace the **Window Snapshot**?"
> **Domain expert:** "No. Keep the current **Capture Delegates** for a title-only change."
