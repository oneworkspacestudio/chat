# Explicit token mapping

No universal shared token package is assumed. Chat consumes workspace.css after
base.css. The shared switcher observes html[data-theme]; Chat now applies the
same effective theme and keeps its own selected system/light/dark preference.

| Component | Light | Dark | Consumed token/owner |
|---|---|---|---|
| Action/focus | #0b57d0 | #a8c7fa | --clr-primary-accent/action |
| Page/rail | #f6f8fc | #15181d | --clr-body-background |
| Conversation header | #f6f8fc | #1c222b | --clr-background-blue-gray-300 |
| Text | #202124 | #e3e8ef | --clr-text-primary |
| Message time/author | #5f6368 | #acb5c3 | consumed timestamp/author tokens |
| Incoming bubble | #f0f4f9 | #29313d | --clr-message-incoming → --clr-bubble-left-bg |
| Outgoing bubble | #d3e3fd | #243f60 | --clr-message-outgoing → --clr-bubble-right-bg |
| Typeface | Arial/system-ui/sans-serif | same | workspace.css cascade |
| App mark | existing navy/mint/silver | same | img/my_chat.svg, unchanged |

Computed style, contrast and focus checks are required; token declarations alone
do not pass visual acceptance. Layout measurements remain separate from branding.
The default conversation surface is plain; an explicitly selected personal
wallpaper remains supported. Message text inherits the Workspace font; code and
icon glyphs keep their own font families.
