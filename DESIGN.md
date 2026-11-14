---
name: Benson YC Media + MFM Benson Youth Church
description: Two separate public sites: a media crew call sheet and a church arrival wayfinding system.
colors:
  media-paper: "#FFF3DF"
  media-ink: "#1E0820"
  media-quiet: "#544654"
  media-rule: "rgb(30 8 32 / .24)"
  media-accent: "#D6197A"
  media-paper-deep: "#F8E6C8"
  app-accent-text: "rgb(199 20 112)"
  app-danger: "rgb(185 28 28)"
  app-good-ink: "rgb(14 104 64)"
  app-warn-ink: "rgb(133 77 0)"
  church-night: "#1E0820"
  church-plum: "#2B0A2C"
  church-white: "#FFFDF8"
  church-gold: "#F6B40E"
  church-magenta: "#D6197A"
typography:
  media-display:
    fontFamily: "Anton, Impact, sans-serif"
    fontSize: "clamp(3.25rem, 6.6vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.025em"
  church-display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(3.25rem, 8vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.96
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    letterSpacing: "0.1em"
  app-caption:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.05em"
  app-small:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  app-input:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  app-lead:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  control: "0px"
spacing:
  page-gutter: "max(20px, calc((100vw - 1280px) / 2))"
components:
  media-action-primary:
    backgroundColor: "{colors.media-accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
  church-action-gold:
    backgroundColor: "{colors.church-gold}"
    textColor: "{colors.church-night}"
    rounded: "{rounded.control}"
    padding: "11px 14px"
    height: "46px"
---

# Design System: Benson YC Media + MFM Benson Youth Church

## Overview

**Creative North Star: “Two doors, two jobs.”**

The media site is a printed crew call sheet translated into a working web page. Its material is warm stock, ruled production rows, and condensed display type. It introduces the departments, explains the Sunday-to-week rhythm, and gives recruits a direct join action. The authenticated roster and publishing tools remain a separate operational workspace.

The church site is a wayfinding experience for a first Sunday. Deep plum acts as the arrival sign; gold marks the next action and magenta identifies MFM. The visitor should quickly find when to attend, what location information is available, what to expect, and how to get directions. It does not share the media page's paper/call-sheet composition.

Both sites belong to MFM Benson Youth Church and may cross-link, but they are not one combined landing page. Use real project copy and assets. No church/member photography or approved testimonials are present in `public/`; do not fabricate social proof. Church time and full street address remain unconfirmed in `content/church.ts`.

**Key Characteristics:**
- Two separately named and navigated public experiences.
- Media: paper ground, editorial timecode, continuous ruled tables, five department rows.
- Church: deep-plum arrival field, clear route markers, service and first-visit sequence.
- Square action controls; no repeated rounded feature-card grids or gradient glows.
- Mobile layouts keep all actions within the viewport and preserve readable labels.

## Colors

The media site is ink on a warm production sheet; the church site uses a deep plum field with high-contrast wayfinding marks.

### Primary
- **Deep Crew Ink** (`#1E0820`): Media sheet typography and the church site's main background.
- **Benson Plum** (`#2B0A2C`): Secondary church surface behind first-visit content.

### Secondary
- **MFM Magenta** (`#D6197A`): Media recruitment action and church wayfinding emphasis.
- **Flame Gold** (`#F6B40E`): Church directions action and wayfinding markers; use on plum or near-black surfaces.

### Neutral
- **Call-Sheet Paper** (`#FFF3DF`): Media site background.
- **Church White** (`#FFFDF8`): Primary text on dark church sections.
- **Media Quiet Ink** (`#544654`): Secondary text and rules on paper.

### Named Rules
**The Two-Site Rule.** A link may connect the destinations; a page must not combine their content hierarchy or visual system.

## Typography

**Media Display Font:** Anton (with Impact fallback)  
**Church Display Font:** Plus Jakarta Sans, weight 800  
**Body Font:** Plus Jakarta Sans

**Character:** The media site's condensed face resembles the headings on an actual production sheet. The church site's humanist sans keeps welcome and arrival information direct and readable. Avoid using the same display treatment for both sites.

### Hierarchy
- **Media display** (400, responsive to 6rem, line height 0.92): Call-sheet identity and section titles.
- **Church display** (800, responsive to 6rem, line height 0.96): Welcome and visitor section headings.
- **Body** (400, 15px, 1.5 line height): Supporting information, role descriptions, and visitor guidance.
- **Label** (800, 11px, 0.1em tracking): Actual production fields and wayfinding fields such as CALL, HOME BASE, WHEN, and WHERE. 11px is the floor; nothing interactive is set this small.

### Member workspace scale
The signed-in app uses the same two families with a compact scale: Anton for page titles (36–60px) and card titles (20–30px); 16px lead text; 15px body; 14px small text and navigation; 11px captions and chips (bold, tracked). Form fields render at 16px on phones (15px from `sm`) so iOS never zooms the page.

### Text colour roles (workspace)
Magenta is a fill. Text uses roles that keep 4.5:1 in light and dark themes: `ink`, `muted`, `accent` (magenta tuned for reading, brighter in dark mode), `danger` (errors and losses only — never brand), `good-ink`, `warn-ink`. Errors always carry `role="alert"` and the `alert-danger` style.

## Layout

The media site uses a full-width call sheet: masthead, headline with the join action directly under it, call details (Sunday call, home base, training), run-of-show, a department register table (department / brief / Sunday call / join), and weekly series. Everything stays on paper; the register sits on a deeper paper tone between heavy rules rather than a dark band. Every section shares one gutter (`--gutter`). On mobile, the call details and run-of-show reflow into a readable single-column register.

The church site starts with a welcome threshold and a WHEN / WHERE / directions route, then moves into a numbered first-visit sequence, future church themes, and real Instagram posts when available. On mobile, route details stack vertically and section navigation remains tappable without horizontal page overflow.

Both pages use a centered wide content measure and responsive gutters. Media and church links identify the destination explicitly; separate domains are configured with `CHURCH_HOST` and `NEXT_PUBLIC_SITE_URL`.

## Elevation & Depth

The public pages are flat by default. Hierarchy comes from full-width color fields, spacing, and thin structural rules—not soft card shadows or zero-offset glow effects.

## Shapes

Both systems use square-edged production and wayfinding surfaces. Buttons remain rectangular. Rules divide real information groups; rounded feature-card shells are not part of either public system.

## Components

### Actions
- **Media primary:** Magenta fill, white label, rectangular, at least 48px tall; the label names the join/workspace action.
- **Church primary:** Gold fill and deep-plum label on the plum wayfinding field; rectangular and at least 46px tall.
- **Secondary links:** Underlined or ruled text links with visible keyboard focus; cross-site links name the destination.

### Navigation
- The media masthead groups the media-unit identity, section anchors and member sign-in. It does not link to the church site.
- The church masthead prioritizes Sunday, first visit, stories, and a separate media-unit link.
- Mobile navigation may wrap or scroll within its own strip; the document itself must not horizontally overflow.

### Lists
- Media departments use a ruled directory with role, tagline, and an individual join/workspace route.
- Church first-visit steps use ordered rows because the sequence itself is meaningful.

## Do's and Don'ts

### Do:
- **Do** keep the media call sheet and church arrival system distinct.
- **Do** use actual department names, service facts, weekly series, and church updates from project content.
- **Do** keep routes and actions fully visible at 320px through desktop widths.
- **Do** verify service time and address before representing them as confirmed.

### Don't:
- **Don't** recombine the church and media websites into one public homepage.
- **Don't** recreate the old scroll-driven 3D doors, phone, card-deal, or cover-flow scenes.
- **Don't** replace real people or posts with decorative avatar dots or invented testimonials.
- **Don't** turn every content group into identical rounded cards, add gradient glows, or use tiny all-caps labels as decoration.
