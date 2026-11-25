---
name: Christian Onovo
description: A record written in his own marks; indigo night, undyed cotton, one camwood line.
colors:
  indigo-night: "#0e1424"
  indigo-night-raised: "#131a2d"
  uli-indigo: "#2b3a6b"
  undyed-cotton: "#ede6d6"
  cotton-raised: "#e4dcca"
  ash-muted: "#ada79a"
  slate-muted: "#545663"
  camwood: "#b2472c"
  camwood-lit: "#d0603f"
  camwood-deep: "#a13a22"
  overprint: "#4a2a3a"
  overprint-day: "#e2cfc4"
  field-day: "#d9d0bc"
  live-green: "#7fb08a"
typography:
  display:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "5.25rem"
    fontWeight: 400
    lineHeight: 0.98
  headline:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "2.6875rem"
    fontWeight: 400
    lineHeight: 1.05
  title:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  focus: "2px"
  control: "7px"
  field: "10px"
  panel: "14px"
  chip: "9999px"
spacing:
  gutter-mobile: "20px"
  gutter-desktop: "72px"
  row: "28px"
  section: "144px"
components:
  button-primary:
    backgroundColor: "{colors.undyed-cotton}"
    textColor: "{colors.indigo-night}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-quiet:
    textColor: "{colors.undyed-cotton}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  input-twin:
    backgroundColor: "{colors.indigo-night-raised}"
    textColor: "{colors.undyed-cotton}"
    rounded: "{rounded.field}"
    padding: "8px 8px 8px 20px"
  chip-choice:
    textColor: "{colors.ash-muted}"
    rounded: "{rounded.chip}"
    padding: "8px 16px"
  chip-choice-selected:
    backgroundColor: "{colors.overprint}"
    textColor: "{colors.undyed-cotton}"
    rounded: "{rounded.chip}"
    padding: "8px 16px"
  panel-assistant:
    backgroundColor: "{colors.indigo-night}"
    rounded: "{rounded.panel}"
    width: "416px"
---

# Design System: Christian Onovo

## Overview

**Creative North Star: "The Uli Cipher"**

A record written in Christian's own marks. Every piece of work, role and discipline carries an authored glyph drawn in the manner of uli, the line art of south-eastern Nigeria: single-weight strokes, curves that close on themselves, generous empty space. The twin decodes the record on request. The page is a dyed cloth at night, indigo ground and undyed cotton type, with one camwood line that runs once and settles.

Density is editorial, not dashboard: wide gutters, hairline rules instead of boxes, one idea per row. Expression is spent in three places only: the Gloock display type, the glyphs, and the single drawn line in the hero. Everything else is quiet so those carry. The system refuses the dark 3D "Hi, I'm" developer hero and the cream editorial serif page; it also refuses glowing AI chrome.

The palette follows London's hour: indigo night by default after dusk, the cotton ground by day, and the visitor can pin either from the command menu.

**Key Characteristics:**
- Indigo-night ground, undyed-cotton type, camwood used only for what is live or selected.
- Gloock for display and headings; Schibsted Grotesk for everything read.
- Hairline rules and full-width rows; no cards, no side stripes, no eyebrow labels.
- One authored line drawing per page; all other motion answers the visitor.
- Grain over everything at 6% (brief-pinned texture).

## Colors

Dyed-cloth colours: an indigo night, the cotton it's printed on, and camwood red, the Igbo dye, as the only voice.

### Primary
- **Camwood** (#b2472c): the source accent. On the night ground it lifts to **Camwood Lit** (#d0603f, 4.7:1) for text and marks; on the day ground it deepens to **Camwood Deep** (#a13a22, 5.4:1). Used for the selected glyph, the hero line's knot, link underlines, the nav indicator, focus rings and status text. Never as a fill behind small text (cotton on camwood is 4.4:1).
- **Overprint** (#4a2a3a): camwood laid over indigo, the third tone two dyes make. Used only for selected states: the active command, the chosen contact reason, row hover. Day equivalent **Overprint Day** (#e2cfc4).

### Secondary
- **Uli Indigo** (#2b3a6b): a field colour for whole bands (About, Contact, case-study architecture) at 30% over the ground. Never text and never a boundary (1.7:1 on night).

### Neutral
- **Indigo Night** (#0e1424): the night ground. **Indigo Night Raised** (#131a2d) for inputs and panels that sit on it.
- **Undyed Cotton** (#ede6d6): night text (14.8:1) and the day ground. **Cotton Raised** (#e4dcca) for day inputs; **Field Day** (#d9d0bc) for day bands.
- **Ash Muted** (#ada79a): secondary text at night (7.7:1). **Slate Muted** (#545663): secondary text by day (5.9:1).
- **Live Green** (#7fb08a): one small dot that marks the twin as available. Nothing else.
- Rules are the text colour at 14% (hairline) and 30% (strong).

### Named Rules
**The One Dye Rule.** Camwood marks what is live or selected and nothing else. If a screen has more than a handful of camwood marks at rest, one of them is decoration; remove it.

**The Field, Not Text Rule.** Uli Indigo fills regions; it never carries words or edges.

## Typography

**Display Font:** Gloock (with Georgia, serif)
**Body Font:** Schibsted Grotesk (with system-ui, sans-serif)

**Character:** Gloock's high contrast and ink-trap cuts read like letters carved from a block; Schibsted is a plain newspaper grotesk that stays out of the way. One voice speaks, the other explains.

### Hierarchy
- **Display** (400, 5.25rem desktop / 3.56rem mobile, 0.98): the homepage headline and case-study titles only. Balanced, max about 13 characters per line.
- **Headline** (400, 2.69–3.56rem, 1.05): section titles.
- **Title** (400, 1.5–2rem, 1.3): row names (projects, roles, expertise areas) in Gloock.
- **Body** (400, 1.0625rem, 1.6): all reading text, 38–62ch measures; lead paragraphs at 1.1875rem in Ash Muted.
- **Label** (400–500, 0.8125–0.9375rem, 1.5): metadata, dates (tabular figures on the digits only), hints. Sentence case, never tracked capitals.

Scale is a perfect fourth from the 17px body: 13, 15, 17, 19, 24, 32, 43, 57, 84px.

### Named Rules
**The No Eyebrow Rule.** Headings carry themselves; nothing small sits above them. Status and metadata go below the heading.

## Layout

A 12-column grid inside a 1440px container, with 72px gutters on desktop and 20px on phones. Most sections split a 5-column heading from a 6-column intro on the right; long lists run full width or start two columns in, leaving the left margin for the timeline line.

Sections breathe at 96px (phone) and 144px (desktop) vertical padding; rows inside them are separated by hairline rules with 28px padding. More space above a heading than below it. The header is sticky at 64px with a blurred ground behind it.

Phones collapse every split to one column, keep the full-width input, and turn the assistant panel into a bottom sheet capped at 85% of the screen.

## Elevation & Depth

Flat. Depth comes from tonal layering: an Uli Indigo band under a section, a raised indigo under inputs and the assistant panel, and the grain over everything. There are no shadows; floating surfaces (the assistant panel, the command menu, the Ask trigger) are defined by a single strong hairline border on the ground colour. The command menu sits over a 55% indigo scrim.

### Named Rules
**The One Edge Rule.** A surface gets a border or a tint, never a border and a shadow.

## Shapes

Mostly square. Corners are small and purposeful: 2px on focus rings, 7px on buttons and command items, 10px on fields and chat bubbles, 14px on floating panels, fully round only on small chips and the Ask trigger. Photographs and screenshots are square-cornered with a hairline border. The recurring silhouette is the uli stroke: 1.6px, round caps and joins, drawn on a 56-unit box for glyphs and stretched without thickening for the page lines.

## Components

### Buttons
Plain and immediate.
- **Shape:** gently squared (7px).
- **Primary:** cotton fill with indigo text (night) or indigo fill with cotton text (day), 44px tall, 20px sides, medium weight.
- **Press:** scales to 0.97 in 160ms on a strong ease-out. No hover lift, no glow.
- **Quiet:** text with a 1px strong border, same press. Text links instead carry a camwood underline that thickens on hover (pointer devices only).

### Chips
- **Style:** fully round, 1px strong border, muted text.
- **Selected:** Overprint fill, camwood-lit border, cotton text. Used for the contact form's reason choice.

### Inputs / Fields
- **Style:** 10px radius, 1px strong border, raised indigo (night) or cotton (day) ground; placeholder in the muted text colour at full opacity.
- **Focus:** the border turns camwood; a 2px camwood focus ring with 3px offset for keyboard focus everywhere.
- **Twin composer:** a growing textarea (Enter sends, Shift+Enter breaks), an Ask/Stop button, and a one-line disclosure that it is an AI that says when it doesn't know.

### Navigation
Sticky header with the mark and name on the left and section links in Schibsted 15px, muted until active. One camwood hairline slides under the active section and fades out above the first section. A bordered key hint opens the command menu. Phones get a Menu button that opens a full-width list set in Gloock.

### Glyph index (signature)
Rows of authored marks: a 56px glyph in camwood, the name in Gloock, a one-line description in muted Schibsted, separated by hairlines. In the hero each row links to its case study, where the same glyph morphs into the page header (view transition). In Selected work each row opens in place to the problem, role and stack.

### Uli line (signature)
One continuous 1.6px line per page area: down the hero's gutter beside the headline, across the gap above the twin input, ending in a camwood knot. It draws once (1.1–1.6s, strong ease-in-out) when it enters view and then stays still; with reduced motion it is simply present. The experience timeline uses the same line in the strong rule colour with a knot per role.

### Conversation
Visitor questions sit right in a 10px tinted bubble; the twin's answers sit left beside its two-ring glyph, in muted body text with cotton emphasis and camwood links. Thinking is the uli wave tracing itself. Errors sit in a bordered box with a camwood dot, a plain message and Try again.

## Do's and Don'ts

### Do:
- **Do** keep camwood for what is live or selected: the active section, the chosen option, the knot, links, focus (The One Dye Rule).
- **Do** separate content with hairline rules (text colour at 14%) and full-width rows.
- **Do** give every new project, role or area its own uli-style glyph on the 56-unit box at 1.6px, round caps.
- **Do** answer interaction with motion under 300ms on the strong ease-out curve; keep panels and drawers under 500ms.
- **Do** check contrast in both palettes; muted text stays at or above 4.5:1.

### Don't:
- **Don't** put a small label or eyebrow above a heading.
- **Don't** build sections from identical icon-heading-text cards.
- **Don't** add a bar down one side of a box, or a shadow under a bordered surface.
- **Don't** use Uli Indigo for text or edges.
- **Don't** animate on scroll for decoration, add a second drawn line to a page that has one, or animate anything opened from the keyboard (the command menu opens instantly).
- **Don't** use nsibidi or any society's signs as ornament; glyphs are authored, and Christian approves each one.
