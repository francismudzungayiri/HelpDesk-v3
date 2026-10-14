---
name: HelpDesky
description: "Internal IT help desk that sits alongside macOS Mail, Reminders and System Settings."
colors:
  system-blue: "#0071e3"
  system-blue-hover: "#0064cc"
  system-blue-wash: "#e8f2fd"
  ink: "#1d1d1f"
  secondary-label: "#6e6e73"
  tertiary-label: "#86868b"
  window-grey: "#f5f5f7"
  group-white: "#ffffff"
  control-border: "#d2d2d7"
  separator: "#e5e5ea"
  control-fill: "#e8e8ed"
  quiet-fill: "rgba(118, 118, 128, 0.12)"
  sidebar-glass: "rgba(240, 240, 243, 0.82)"
  graphite: "#3a3a3c"
  unassigned-dash: "#aeaeb2"
  open-blue: "#0062cc"
  open-blue-wash: "#e5f0fd"
  progress-purple: "#8944ab"
  progress-purple-wash: "#f4eafa"
  resolved-green: "#1f7a36"
  resolved-green-wash: "#e7f6ec"
  alert-red: "#d70015"
  alert-red-wash: "#ffebea"
  caution-orange: "#c93400"
  caution-orange-wash: "#fff1e3"
  note-yellow-wash: "#fff9db"
  note-yellow-rule: "#f2d978"
  note-yellow-ink: "#6e5300"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.022em"
  portal-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.024em"
  stat:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  auth-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.022em"
  ticket-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.018em"
  section-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  field-value:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  row-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "-0.005em"
  control:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  ticket-id:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    fontFeature: "tnum"
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  row: "6px"
  control: "8px"
  group-field: "10px"
  card: "12px"
  sheet: "14px"
  auth-panel: "18px"
  capsule: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  page: "36px"
components:
  button-primary:
    backgroundColor: "{colors.system-blue}"
    textColor: "{colors.group-white}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "6px 14px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.system-blue-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.control-fill}"
    textColor: "{colors.secondary-label}"
  button-secondary:
    backgroundColor: "{colors.control-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 14px"
    height: "32px"
  button-danger:
    backgroundColor: "{colors.control-fill}"
    textColor: "{colors.alert-red}"
    rounded: "{rounded.control}"
    padding: "6px 14px"
  button-danger-hover:
    backgroundColor: "{colors.alert-red-wash}"
  button-large:
    backgroundColor: "{colors.system-blue}"
    textColor: "{colors.group-white}"
    rounded: "{rounded.group-field}"
    height: "44px"
  card:
    backgroundColor: "{colors.group-white}"
    rounded: "{rounded.card}"
  input:
    backgroundColor: "{colors.group-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  search-field:
    backgroundColor: "{colors.quiet-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
  grouped-fields:
    backgroundColor: "{colors.group-white}"
    rounded: "{rounded.group-field}"
    padding: "8px 14px 9px"
  segmented-track:
    backgroundColor: "{colors.control-fill}"
    rounded: "{rounded.control}"
    padding: "2px"
  segmented-segment-selected:
    backgroundColor: "{colors.group-white}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.row}"
    height: "28px"
  sidebar-row:
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    height: "30px"
    padding: "0 10px"
  sidebar-row-selected:
    backgroundColor: "{colors.system-blue}"
    textColor: "{colors.group-white}"
  priority-high:
    backgroundColor: "{colors.alert-red-wash}"
    textColor: "{colors.alert-red}"
    typography: "{typography.caption}"
    rounded: "{rounded.capsule}"
    padding: "3px 10px"
  priority-medium:
    backgroundColor: "{colors.caution-orange-wash}"
    textColor: "{colors.caution-orange}"
    rounded: "{rounded.capsule}"
    padding: "3px 10px"
  priority-low:
    backgroundColor: "{colors.resolved-green-wash}"
    textColor: "{colors.resolved-green}"
    rounded: "{rounded.capsule}"
    padding: "3px 10px"
  unassigned-capsule:
    textColor: "{colors.secondary-label}"
    rounded: "{rounded.capsule}"
    padding: "3px 10px"
  sheet:
    backgroundColor: "{colors.group-white}"
    rounded: "{rounded.sheet}"
  auth-panel:
    backgroundColor: "{colors.group-white}"
    rounded: "{rounded.auth-panel}"
    padding: "36px 32px 28px"
    width: "400px"
---

# Design System: HelpDesky

## Overview

**Creative North Star: "A Native Mac App in the Browser"**

HelpDesky should feel like it shipped alongside macOS Mail, Reminders and System Settings. The window is a calm grey ground. A translucent source-list sidebar sits on the left. Work happens in white inset groups with hairline shadows, and every action is system blue. The commitment is to convention, carried out with care: nothing invents a bespoke look, so colleagues already know how everything works the first time they see it.

The same tokens serve three registers. Sign-in and registration are a single centred panel in the style of an Apple ID screen. The staff side is a source-list app: large titles, segmented controls, a rounded search field, and a white table group that reads like a Mail message list. The end-user portal swaps the sidebar for a translucent top bar over one centred column, and tells each person where their ticket stands in plain words inside a coloured capsule. Status and priority use Apple's system colours. Shape and placement say what a mark is (a capsule for priority, a dot and a label for status), and colour confirms it.

**Key Characteristics:**
- System font only (San Francisco on Apple devices, Segoe UI Variable on Windows). Hierarchy comes from weight, size and tight negative tracking.
- Window Grey ground, white groups on 12px corners with a hairline-plus-whisper shadow, and Separator lines inside them.
- One action colour (System Blue) for buttons, links, the selected sidebar row and focus.
- Segmented controls on a Control Fill track with a white raised segment, never tabs or underlines.
- Capsule priority tags, dot-plus-label statuses, avatar-plus-name assignees and a dashed "Unassigned" capsule.
- Glass is only for chrome: the staff sidebar and the portal top bar blur what scrolls beneath them (saturate 180%, blur 20px).

## Colors

The palette is Apple's light-mode system palette: near-black ink, warm-neutral greys, one saturated blue for actions and the system hues for state.

### Primary
- **System Blue** (#0071e3): primary buttons, links, the selected sidebar row (white text on blue), the sidebar's icons, the active count in a segmented view, focus borders and the grouped-field focus ring. It is the only colour that means "you can act here".
- **System Blue Hover** (#0064cc): hover state for every blue button.
- **System Blue Wash** (#e8f2fd): the Admin role badge background, and the tint behind selected text (at 20% alpha).

### Neutral
- **Ink** (#1d1d1f): all main text, headings and secondary-button labels.
- **Secondary Label** (#6e6e73): ledes, meta lines, table headers, field captions, timestamps and disabled-button text.
- **Tertiary Label** (#86868b): the small profile icon in the sidebar. Sidebar section captions use Secondary Label so they pass 4.5:1 on the glass.
- **Window Grey** (#f5f5f7): the page ground behind every group, row hover, and the background of staff reply bubbles.
- **Group White** (#ffffff): cards, tables, sheets, the auth panel, inputs and the raised segment.
- **Control Border** (#d2d2d7): the 1px outline of standalone inputs and the grouped-field box.
- **Separator** (#e5e5ea): every line inside a group: table rules, grouped-field dividers (drawn as a 1px gap), section rules on the ticket page, the hairline above the auth footer and the board's row rules.
- **Control Fill** (#e8e8ed): segmented-control tracks, secondary and danger buttons, the mobile menu button, the active portal-bar link and the disabled primary button.
- **Quiet Fill** (rgba(118, 118, 128, 0.12)): the search field and the sort pop-up at rest. They turn white when focused.
- **Sidebar Glass** (rgba(240, 240, 243, 0.82)): the staff sidebar behind a backdrop blur. The portal bar uses white at 78% alpha in the same way.
- **Graphite** (#3a3a3c): non-status chart series in Reports, and portal "Show fixed" toggle text.
- **Unassigned Dash** (#aeaeb2): the 1px dashed outline of the "Unassigned" capsule.

### Status, priority and availability
Each meaning has an ink and a wash, taken from Apple's system colours. The CSS exposes them as `--open-ink` / `--open-wash`, `--progress-ink` / `--progress-wash`, `--resolved-ink` / `--resolved-wash`, `--alert-ink` / `--alert-wash` and `--caution-ink` / `--caution-wash`.

| Meaning | Ink | Wash | Used for |
|---|---|---|---|
| Open | Open Blue (#0062cc) | Open Blue Wash | Status dot OPEN, the portal "Waiting for IT" capsule, the confirmation band |
| In progress | Progress Purple (#8944ab) | Progress Purple Wash | Status dot IN_PROGRESS, the portal "working on it" capsule |
| Resolved, Low, Available | Resolved Green (#1f7a36) | Resolved Green Wash | Status dot RESOLVED, Low priority capsule, the Available availability dot, the portal "Fixed" capsule and band |
| High, On leave, Danger | Alert Red (#d70015) | Alert Red Wash | High priority capsule, the On leave dot, form errors, danger-button text and hover |
| Medium, At workshop, Attention | Caution Orange (#c93400) | Caution Orange Wash | Medium priority capsule, the At workshop dot, a dashboard stat that needs attention |

**Internal Note Yellow** (wash #fff9db, rule #f2d978, ink #6e5300) is used only on the staff ticket page. It marks internal notes in the activity feed and colours the composer while it is in Internal note mode, so staff can see at a glance what end users will not see.

### Named Rules
**The One Blue Rule.** System Blue is the only interactive colour. Status, priority and availability hues describe state; they are never buttons or links.

**The Shape-Carries-Meaning Rule.** Priority is always a tinted capsule (wash background, ink text, 7px leading dot). Staff status is always a 7px ink dot followed by an Ink label, with no fill. Assignment is an avatar and first name, or a dashed "Unassigned" capsule. On the staff side, a status never becomes a filled capsule and a priority never becomes a bare dot. On the portal, the status phrase is the one exception: it is a capsule in the status wash, because there it is the headline.

**The Same-Hue-Everywhere Rule.** A status or priority uses the same ink in a dot, a capsule, a portal phrase, a timeline dot and a Reports chart bar. Charts that do not show status (category, volume over time) use Graphite, never System Blue.

## Typography

**Body Font:** System UI stack (-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif), antialiased.

**Character:** The text a Mac user already reads all day. Titles are bold with tight negative tracking, in the Apple style. Labels are sentence case, never uppercase.

### Hierarchy
- **Large Title** (700, 28px, 1.15, -0.022em): the staff page title ("Tickets", "Dashboard", "Staff"); 26px below 760px.
- **Portal Title** (700, 32px, 1.15, -0.024em, balanced): the end-user greeting and page titles.
- **Stat** (700, 34px, 1.05, -0.025em): dashboard numbers in Ink, or Caution Orange when a number needs attention.
- **Auth Title** (700, 24px, -0.022em): "Sign in to HelpDesky" under the app icon.
- **Ticket Title** (700, 22px, 1.25, -0.018em, balanced): the title of a staff ticket.
- **Section Title** (600, 17px, -0.01em): headings for cards and side panels ("Update ticket", "Conversation and activity"). Sheet titles use 700 at 19px.
- **Field Value** (400, 15px): text typed into grouped fields, and the ticket's problem text (1.55 line height, 72ch measure).
- **Body / Row Title** (14px; 400 for body, 600 for queue titles): table content and buttons (weight 500).
- **Control** (500, 13px): segmented segments, the availability pop-up, status labels and ticket numbers (with tabular figures).
- **Caption** (600, 12px, sentence case): table headers, field captions, priority capsules and the board's column headers. Sidebar section captions are 11px at 600, in Tertiary Label.

### Named Rules
**The Sentence-Case Rule.** No uppercase labels or tracked-out captions. Headers, captions, badges and buttons are sentence case at 0 tracking, the way macOS sets them.

**The Say-It-In-Words Rule.** End users never see a raw status enum. Their status phrases come from one vocabulary (`client/src/utils/ticketStatus.js`): "Waiting for IT", "With {first name}", "{first name} is working on it" or "Being worked on", and "Fixed". Staff see the short labels Open, In progress and Resolved.

## Layout

- **Staff shell.** A fixed 240px glass sidebar on the left. The content area sits beside it with 28px top, 36px side and 48px bottom padding. Page headers place the Large Title and a Secondary Label lede on the left, with the primary action on the right.
- **Queue.** A toolbar row holds the scope segmented control (All tickets / Mine), the views segmented control (Active, Unassigned, Resolved, All, each with a count), the rounded search field and the sort pop-up. Below it is one white table group with fixed columns (#id 72px, priority 104px, status 124px, assignee 156px, updated 116px, and the problem column takes the rest). Cells have 16px side padding and 13px vertical padding. A pager row ("1–7 of 13", Previous / Page n of m / Next) sits under a Separator.
- **Ticket page.** A two-column grid (2fr content, 260px-minimum side panel, 20px × 16px gaps). The left column holds the details group (title, meta, state row, an auto-filling definition grid of fields with a 180px minimum column, and the problem text) and the conversation group (activity feed and composer). The right column holds the "Update ticket" grouped fields and a full-width Save button.
- **Sign-in and register.** A centred grid on Window Grey with 48px vertical padding. The panel is 400px wide (560px for registration).
- **Portal shell.** A sticky 56px glass top bar and a 928px centred column (24px side padding, 40px top, 96px bottom). The board is a three-column grid (64px number, flexible description, 250–300px status).
- **Below 1080px.** The sidebar narrows to 212px and the content padding drops to 24px.
- **Below 760px.** The sidebar becomes a top bar with a Control Fill "Menu" button. Content padding is 18px top and 16px sides. Segmented controls stay on one row, take the full width within the margins and scroll sideways rather than wrap. The search field and sort pop-up grow to 44px. Queue rows become stacked items (#id on the left, time on the right, then the title and the state row). Two-column grouped fields collapse to one column.
- **Below 640px (portal).** Board rows restack, and the submit and reply buttons go full width.
- **Spacing.** Based on 4px, with common steps of 8, 12, 16 and 24px. Internal gaps in groups are 12–18px.

## Elevation & Depth

Depth comes from layering, as on macOS: white groups float just above the grey window on a near-invisible shadow, chrome is frosted glass, and only sheets and the auth panel cast a real shadow.

### Shadow Vocabulary
- **Group hairline** (`box-shadow: 0 0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)`): every card, table group, portal board, ticket section and report form. It replaces the border.
- **Raised segment** (`box-shadow: 0 1px 2px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.06)`): the selected segment of a segmented control.
- **Auth panel** (`box-shadow: 0 0 0 1px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08)`): the sign-in and register panel.
- **Sheet** (`box-shadow: 0 0 0 0.5px rgba(0,0,0,0.08), 0 24px 60px rgba(0,0,0,0.28)`): dialogs, over a 28% black scrim with a 2px blur.
- **Focus ring** (`box-shadow: 0 0 0 4px rgba(0,113,227,0.22)`): focused inputs and the grouped-field box, with the border turned System Blue.

### Named Rules
**The Glass-Is-Chrome Rule.** Backdrop blur (saturate 180%, blur 20px) belongs only to persistent chrome: the staff sidebar and the portal top bar. Content groups are opaque white.

## Shapes

Corners follow macOS's nested scale: 6px for sidebar rows and selected segments, 8px for buttons, inputs, pop-ups and segmented tracks, 10px for the grouped-field box, large buttons, option tiles, chips and alerts, 12px for cards, the portal board, status bands, feed bubbles and the composer, 14px for sheets and 18px for the auth panel. Tags, status phrases and avatars are capsules or circles. Groups have no border, only the hairline shadow. Inside a group, lines are 1px Separator. The only dashed line in the system is the "Unassigned" capsule.

## Components

### Brand mark
- The owner-supplied HelpDesky logo is a blue headset around a chat bubble with three dots (`client/public/helpdesky-logo.png`, 256px, transparent). It appears as an image with no tile, frame or shadow. It shows at 30px beside "HelpDesky" (15px/600, -0.01em) in the sidebar, at 28px in the portal bar, and at 76px above the title on the sign-in and register panel. `favicon-32.png` and `apple-touch-icon.png` are the browser tab and home-screen icons. The logo is the only brand asset: don't recolour it, put it on a tile, or swap it for an icon glyph.

### Buttons
- **Shape:** 8px corners, 32px minimum height, 6px × 14px padding, 14px/500 text, no border. Colour transitions take 120ms ease-out.
- **Primary:** System Blue with white text, System Blue Hover on hover.
- **Secondary:** Control Fill with Ink text, #dedee3 on hover.
- **Danger:** Control Fill with Alert Red text. Hover turns it Alert Red Wash.
- **Disabled:** Control Fill with Secondary Label text, never a faded blue.
- **Large:** sign-in "Sign in" and the portal's submit and reply buttons are 44px tall with 10px corners at 15–16px/600. The sign-in button spans the full width. The portal's "Report a problem" bar is a 64px System Blue slab with 12px corners.

### Segmented controls
- A Control Fill track with 2px padding and 8px corners. Segments are 28px tall (34px on mobile), 13px/500, and transparent. The selected segment is white with the raised-segment shadow. View counts sit inline in Secondary Label and turn System Blue on the selected segment. Used for queue scope, queue views, the composer's Internal note / Reply switch and the priority choice.

### Tags and marks
- **Priority capsule:** 3px × 10px padding, 12px/600, wash background, ink text, 7px leading dot.
- **Status mark:** a 7px dot in the status ink, then the label in Ink at 13px/500.
- **Assignee:** a 22px avatar, then the first name at 13.5px/500. An unassigned open ticket shows a dashed Unassigned Dash capsule in Secondary Label. A resolved ticket with no assignee shows an em dash.
- **Ticket number:** "#18" in Secondary Label, 13px/500, tabular figures. It is quiet metadata, not a badge.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Group White on Window Grey.
- **Shadow Strategy:** the group hairline (see Elevation). No border.
- **Internal Padding:** 24px. Queue cells use 16px × 13px.

### Inputs / Fields
- **Grouped fields (signature):** fields are stacked in one 10px-cornered box with a Control Border outline. The dividers are a 1px gap showing Separator, never per-cell borders. Each cell has a 12px/500 Secondary Label caption above a borderless 15px value (8px × 14px padding). A two-column variant collapses below 760px. Used for sign-in, registration, Create ticket and the ticket's Update panel.
- **Focus:** the whole box gets a System Blue border and the 4px focus ring, and the active cell takes a faint #f7faff tint. Keyboard focus on other controls is a 3px System Blue outline at 55% alpha, offset 2px.
- **Error:** the cell turns #fff6f6 with a 12px/500 Alert Red message. A form-level error is an Alert Red Wash block with 10px corners.
- **Standalone inputs:** 1px Control Border, 8px corners, white. Portal inputs are 16px text with a 44px minimum height.
- **Search and pop-ups:** a 36px Quiet Fill field with no border. The sort pop-up and the sidebar availability pop-up draw a macOS up/down chevron (an inline SVG background image in #6e6e73).

### Navigation
- **Staff sidebar (source list):** the app mark, then sections captioned "Work", "People" and "Admin" (11px/600, Tertiary Label). Rows are 30px tall with 6px corners, a 14px label and a System Blue Feather icon. Hover is 5% black. The selected row is solid System Blue with white text and a white icon. At the foot: the user row (avatar, name, "Role · Profile"), the availability pop-up (a white 7px-cornered control with a coloured status dot) and a quiet "Log out" row.
- **Portal bar:** the app mark on the left. On the right are "My tickets", the user's name (as the Profile link) and "Log out", as 8px-cornered links. The active link sits on Control Fill.

### Sheets (dialogs)
- 14px corners with the sheet shadow over a 28% scrim. They enter over 260ms with cubic-bezier(0.2, 0.9, 0.3, 1.1), rising 8px from a 0.98 scale. Focus is trapped, Escape closes the sheet and focus returns on close. The animation is disabled under reduced motion.

### Activity feed and composer (staff ticket)
- Events are a small grey dot and one line ("**Name** took the ticket · 1 hour ago"). Messages are avatar-led bubbles with 12px corners: replies on Window Grey, internal notes on Note Yellow with a Note Yellow rule and a lock-icon "Internal note" label. The composer is a 12px-cornered panel that turns Note Yellow in Internal note mode, with a segmented Internal note / Reply switch.

### Portal board and ticket page (end users)
- **Board:** one white group with a heading ("Your tickets"), a sentence-case column header row (Ticket / What you reported / Where it stands), then rows of the #number (Secondary Label), the user's own words (16px/500, clamped to two lines) with a meta line, and the status phrase as an 18px/600 capsule in the status wash and ink, with "Updated … ago" below. Fixed tickets fold behind a "Show fixed (n)" toggle.
- **Status band:** a 12px-cornered panel in the status wash, with the phrase in bold status ink, a detail sentence, and "What IT did" under a tinted divider.
- **Timeline:** "What's happened" on a 1px spine. Status events are dots in the status ink. Messages are 12px-cornered Window Grey bubbles (62ch maximum) marked by hollow rings on the spine.
- **Motion:** a row that changes during a live update, or a ticket that was just sent, flashes its status wash once. The confirmation band slides in once. Both are removed under reduced motion.

## Do's and Don'ts

### Do:
- **Do** wrap every new screen in `.app-shell`, `.auth-screen` or `.portal-shell` so it picks up the scoped macOS tokens. Outside those wrappers, the legacy `:root` values apply.
- **Do** use System Blue (#0071e3) for actions, links, the selected row and focus, and nothing else.
- **Do** put content in white 12px groups with the hairline shadow on Window Grey (#f5f5f7), with Separator (#e5e5ea) lines inside.
- **Do** use a segmented control on a Control Fill (#e8e8ed) track for any switch between two to five views.
- **Do** collect related inputs in a grouped-field box with sentence-case captions inside each cell.
- **Do** show priority as a tinted capsule, staff status as a dot and label, and assignment as an avatar and name or the dashed Unassigned capsule.
- **Do** keep segmented controls on one row on mobile, within the page margins, scrolling sideways if they overflow.
- **Do** pair every animation with a `prefers-reduced-motion` override.
- **Do** use the supplied logo image for the brand mark wherever HelpDesky identifies itself.

### Don't:
- **Don't** set labels, headers or captions in uppercase or with letter-spacing.
- **Don't** fill a staff status as a capsule, or use status and priority hues for buttons or links.
- **Don't** add borders to cards. The hairline shadow is the edge.
- **Don't** use backdrop blur on content groups. Glass is for the sidebar and the portal bar.
- **Don't** fade a disabled primary button to pale blue. Use Control Fill with Secondary Label text.
- **Don't** show end users raw status enums.
- **Don't** add a bespoke brand typeface or accent colour. The system font and the system palette are the identity.

### Known gaps (not rules)
- **Reports** now uses the macOS segmented control, the dashboard stat tiles, human durations ("5 min", "2.6 h", "218 days") and a print style in the system colours. Reports filters and **Ticket Settings** use the shared `.form-group` treatment: 13px secondary labels, 36px controls and pop-up selects with the double chevron. Ticket Settings has no further bespoke layout.
- **Avatars** are a neutral grey gradient (#6e6e73 to #545458) with white initials, the same for everyone, so they never compete with status colour.
- **Legacy `:root` tokens** (#0052cc primary, #172b4d text, #f4f5f7 ground) still sit under the scoped macOS overrides. The 2026-10 polish removed 53 dead legacy rules and the unused `App.css`, but some base rules with 3px corners remain underneath. They are not the system.
- **Portal tone rules** (`--tone-rule` #b3d4ff, #c0b6f2, #abf5d1) and the confirmation band's #b3d4ff border are legacy hues that the macOS section has not retuned. They still draw the status band's divider.
