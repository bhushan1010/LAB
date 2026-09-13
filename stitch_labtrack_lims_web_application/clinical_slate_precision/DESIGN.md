---
name: Clinical Slate Precision
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bec8d2'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#88929b'
  outline-variant: '#3e4850'
  surface-tint: '#89ceff'
  primary: '#89ceff'
  on-primary: '#00344d'
  primary-container: '#0ea5e9'
  on-primary-container: '#003751'
  inverse-primary: '#006591'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#d0bcff'
  on-tertiary: '#3c0091'
  tertiary-container: '#a986ff'
  on-tertiary-container: '#3e0097'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c9e6ff'
  primary-fixed-dim: '#89ceff'
  on-primary-fixed: '#001e2f'
  on-primary-fixed-variant: '#004c6e'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  dark-bg-base: '#0F172A'
  dark-surface-card: '#1E293B'
  dark-surface-elevated: '#334155'
  dark-border-subtle: '#1E293B'
  dark-border-default: '#334155'
  dark-border-focus: '#0EA5E9'
  dark-text-primary: '#F1F5F9'
  dark-text-secondary: '#94A3B8'
  dark-text-muted: '#64748B'
  light-bg-base: '#F8FAFC'
  light-surface-card: '#FFFFFF'
  light-surface-elevated: '#F1F5F9'
  light-border-default: '#E2E8F0'
  light-text-primary: '#0F172A'
  light-text-secondary: '#475569'
  status-success-base: '#10B981'
  status-success-bg: '#064E3B'
  status-warning-base: '#F59E0B'
  status-warning-bg: '#78350F'
  status-error-base: '#F43F5E'
  status-error-bg: '#881337'
  status-info-base: '#0284C7'
  status-info-bg: '#0C4A6E'
  status-admin-base: '#8B5CF6'
  status-admin-bg: '#4C1D95'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-dense:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  badge-label:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-xxs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-xxl: 3rem
  nav-height: 4rem
  table-row-compact: 2.5rem
  table-row-standard: 3.25rem
---

## Brand & Style

This design system delivers an uncompromising, clinical, and high-velocity digital workspace tailored for diagnostic laboratory technicians, administrative directors, and referring clinical practitioners. The aesthetic blends modern healthcare SaaS precision with the technical rigour of mission-critical fintech interfaces. 

It rejects playful consumer tropes, decorative illustrations, arbitrary gradients, and visual noise. The experience evokes calm composure, technical authority, absolute data integrity, and low cognitive fatigue under prolonged shift conditions.

### Architectural Direction
- **Style:** Corporate / Modern Precision with High Data Density.
- **Core Tenet:** Color is an instrument of status and state, never pure ornamentation.
- **Interface Atmosphere:** Deep, atmospheric navy/slate foundations paired with razor-sharp structural outlines, micro-pill indicators, and tabular typography designed for rapid visual scanning.

## Colors

The color architecture enforces absolute consistency between operational modes and semantic statuses across all modules (Registration, Report Studio, Print Queue, Audit Logs, and Client Portal).

### Color Philosophy
- **Dark Mode (Default Environment):** Built on an ink-slate core (`#0F172A`) rather than harsh pure black (`#000000`), reducing optical glare during extended low-light shifts. Cards and workspaces sit at `#1E293B`, framed with surgical `#334155` strokes.
- **Light Mode (Portal & Daytime Administrative):** Utilizes soft `#F8FAFC` base layers with pure `#FFFFFF` modular containers and clean `#E2E8F0` delimiters to prevent eye strain.
- **Strict Status Token Binding:**
  - **Success / Synced / Printed:** Emerald (`#10B981`)
  - **Warning / Pending / Unresolved:** Amber (`#F59E0B`)
  - **Error / Failed / Forbidden / Cancelled:** Rose (`#F43F5E`)
  - **Info / In-Progress / Processing:** Sky Blue (`#0284C7`)
  - **Elevated Privileges / Workstation Admin:** Royal Purple (`#8B5CF6`)

## Typography

Typography prioritizes legibility, compact metric scan speeds, and numerical vertical alignment.

- **Primary Interface Typeface (Inter):** Deployed across all display headers, metadata values, form labels, and narrative clinical descriptions. Characterized by tall x-height and exceptional clarity at dense 13px–14px sizes.
- **Tabular & Code Typeface (JetBrains Mono):** Dedicated to technical strings, Patient UHIDs, Barcodes, Sample Trackers, Timestamps, and Audit JSON payloads. Forces fixed-width alignment down continuous grid rows.
- **Rules of Scale:** Never scale body text below 13px in dense production grids; reserve 11px exclusively for upper-cased status indicators and badge tags.

## Layout & Spacing

The layout model is optimized for widescreen laboratory workstations while adapting cleanly down to tablets and secure clinic terminals.

- **Structural Layout:** Full-width adaptive layout anchored by a persistent, fixed top navigation bar (`64px` / `4rem` height) housing workstation routing, network sync flags, role identity, and theme controls.
- **Split-Screen Workbenches (e.g., Report Studio):** Employs a locked 55/45 or 50/50 dual-pane viewport. The left pane functions as a multi-tier scrollable form input; the right pane maintains a fixed, aspect-accurate preview of the live A4 clinical document.
- **Grid & Alignments:** Built on a base 4px metric system (`space-xs` = 8px, `space-md` = 16px, `space-lg` = 24px). Dense data tables default to `40px` (`2.5rem`) row heights to permit scanning of 15+ records above the vertical fold.

## Elevation & Depth

Visual depth is achieved through surgical surface layering and precision containment strokes rather than dramatic, blurry shadows.

- **Level 0 (Base Canvas):** `#0F172A` in dark mode, `#F8FAFC` in light mode. Completely flat.
- **Level 1 (Card & Module Containers):** Surface layer elevated via fill difference (`#1E293B` dark, `#FFFFFF` light) framed with a continuous 1px hairline border (`#334155` dark, `#E2E8F0` light).
- **Level 2 (Popovers, Tooltips, Action Menus):** Layered over modules with subtle backdrop filtration (`backdrop-filter: blur(8px)`) and micro-shadow: `0 4px 12px -2px rgba(0, 0, 0, 0.4)`.
- **Level 3 (Modal Dialogs):** Centered view overlays paired with an opaque slate veil (`rgba(15, 23, 42, 0.75)`), boxed with solid 1px borders and high-density outer depth (`0 20px 25px -5px rgba(0, 0, 0, 0.5)`).

## Shapes

The design system employs controlled, softened geometry to balance clinical exactness with modern usability:

- **Standard Elements (8px / `rounded-md`):** Used universally for input text boxes, standard action buttons, dropdown select menus, and interactive table row focus frames.
- **Containers & Surface Panels (12px / `rounded-lg`):** Cards, modal shells, diagnostic preview wrappers, and dashboard KPI tiles.
- **Badges & Micro Indicators (9999px / `rounded-full`):** Pill shape reserved exclusively for operational statuses (Sync, Print, Role badges, Patient Category indicators) to differentiate data points from clickable interactive buttons.

## Components

### 1. Status & Role Badges
- **Visual Spec:** Fully pill-shaped (`rounded-full`), padded `2px 10px`, typography set to `JetBrains Mono` 11px uppercase weight 600.
- **Coloration:** Dark mode applies a 12% tint background with a 30% border stroke and 100% full-intensity text. (e.g., Emerald badge: background `rgba(16, 185, 129, 0.12)`, border `rgba(16, 185, 129, 0.3)`, text `#10B981`).

### 2. High-Legibility Data Tables
- **Headers:** Sticky positioning, background matched to `#1E293B`, subtle bottom border `#334155`, text set in `Inter` 12px uppercase medium with `letter-spacing: 0.05em`.
- **Rows:** Alternating subtle hover state (`rgba(255, 255, 255, 0.02)` in dark mode). Tabular columns (specimen codes, timestamps, test values) strictly render in `JetBrains Mono`.
- **Actions:** Right-aligned icon buttons inside transparent containers that resolve into `#334155` button pills on mouseover.

### 3. Form Inputs & Fieldsets
- **Field Placement:** Static, high-clarity label positioned 6px directly above the control; mandatory elements signified by `#F43F5E` micro-asterisk.
- **Input Styling:** Height `38px`, border `1px solid #334155`, fill `#0F172A`, text `#F1F5F9`. Focus state applies a solid 1px highlight `#0EA5E9` and zero offset outer glow.
- **Validation:** Direct inline subtext aligned below inputs, rendered in `#F43F5E` (error) or `#10B981` (valid).

### 4. Primary, Ghost & Destructive Buttons
- **Primary:** Filled `#0EA5E9` with dark contrast label `#0F172A` or `#FFFFFF` (minimum 4.5:1 ratio). Reserved strictly for the single primary operation per viewport (e.g., "Save & Finalize", "Open Report Studio").
- **Secondary / Ghost:** Transparent base with `#334155` perimeter border and `#F1F5F9` text.
- **Destructive:** Bordered or solid `#F43F5E` styling, reserved for critical interventions (Deactivate Account, Cancel Sample) with required secondary modal confirmation.

### 5. Modals & Drawers
- Dismissible via dedicated top-right glyph, outer veil click, or `Escape` stroke. Contains structured header, content separator line, and sticky bottom action toolbar with explicit "Cancel" and positive confirmation controls.