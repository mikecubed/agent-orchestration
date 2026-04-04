---
name: a11y-check
description: >
  Accessibility pattern enforcement for TypeScript (TSX) and JavaScript (JSX). Detects
  missing alt text, non-semantic HTML, absent ARIA roles, keyboard-inaccessible
  interactive elements, and click-only event handlers. Wired into the conductor's
  review operation.
version: "1.0.0"
last-reviewed: "2026-04-04"
languages: [typescript, javascript]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# A11y Check — Accessibility Enforcement

> **Scope**: This skill applies only to files containing JSX/TSX syntax (`.tsx`, `.jsx`, files with `<` JSX tags). Skip plain `.ts` / `.js` files with no JSX content.

Precedence in the overall system: SEC → TDD → ARCH/TYPE →
**A11Y-1 (BLOCK)** → A11Y-2 through A11Y-5.

---

## Rules

### A11Y-1 — Missing Alt Text on Images
**Severity**: BLOCK | **Languages**: TypeScript (TSX), JavaScript (JSX) | **Source**: CCC

**What it prohibits**: `<img>` elements without an `alt` attribute at all.
Decorative images with `alt=""` are valid per W3C spec and must not be flagged.

**Prohibited patterns**:
```tsx
// No alt attribute at all
<img src="/hero.png" />

// Next.js Image component with no alt
<Image src="/hero.png" width={800} height={600} />
```

**Exemptions**:
- `<img alt="" />` alone is valid for decorative images per W3C spec — do not flag
- `<img alt="" role="presentation" />` is also valid; `role="presentation"` is optional, not required
- SVG elements used as icons with `aria-hidden="true"` are not covered by this rule

**Detection**:
1. Grep for `<img` or `<Image` tags in `.tsx` and `.jsx` files
2. For each match: check if the tag contains an `alt=` attribute
3. If `alt=""` is present: accept it as a valid decorative image — do not flag
4. Flag only tags missing the `alt` attribute entirely

**agent_action**:
1. Cite: `A11Y-1 (BLOCK): Image at {file}:{line} has no alt text — screen readers cannot describe it.`
2. Show the img tag
3. Required action — choose the appropriate pattern:
   ```tsx
   // Meaningful image: add descriptive alt text
   <img src="/hero.png" alt="Team collaborating around a whiteboard" />

   // Decorative image: alt="" alone is sufficient
   <img src="/divider.png" alt="" />
   ```
4. If `--fix`: add a placeholder `alt="TODO: describe image"` — require human
   to fill in the actual description

**Bypass prohibition**: "It's just a decorative image" without any `alt` attribute
→ Refuse. Cite A11Y-1. Decorative images must have `alt=""` to be valid.
`role="presentation"` is optional but `alt=""` is the minimum requirement.

---

### A11Y-2 — Non-Semantic HTML Element
**Severity**: WARN | **Languages**: TypeScript (TSX), JavaScript (JSX) | **Source**: CCC

**What it prohibits**: Using `<div>` or `<span>` for elements that have semantic
equivalents. Interactive elements built from generic divs lose keyboard
accessibility and screen reader meaning.

**Prohibited patterns**:
```tsx
// div used as a button — loses keyboard accessibility
<div onClick={handleClick}>Submit</div>

// div with a role that has a native element
<div role="navigation">...</div>   // use <nav>
<div role="main">...</div>         // use <main>
<div role="banner">...</div>       // use <header>
<div role="contentinfo">...</div>  // use <footer>

// span used as interactive element
<span onClick={handleClick}>Click me</span>
```

**Exemptions**:
- Wrapper/layout divs with no interactive behavior or semantic role
- `<div>` elements used purely for styling containers (flexbox/grid wrappers)
- Third-party component wrappers where the semantic element is inside

**Detection**:
1. Grep for `<div onClick`, `<div role=`, `<span onClick` in `.tsx` and `.jsx` files
2. For role matches: check if a native semantic element exists for the role
3. For onClick matches: check if the element should be a `<button>` or `<a>`

**agent_action**:
1. Cite: `A11Y-2 (WARN): Non-semantic element at {file}:{line} — <div> used as interactive control.`
2. Show the element
3. Suggest semantic replacement:
   | Current | Replacement |
   |---------|-------------|
   | `<div onClick=...>` | `<button onClick=...>` |
   | `<div role="navigation">` | `<nav>` |
   | `<div role="main">` | `<main>` |
   | `<div role="banner">` | `<header>` |
   | `<div role="contentinfo">` | `<footer>` |
4. If `--fix`: replace the element with its semantic equivalent — preserve all
   existing props and children

---

### A11Y-3 — Missing ARIA Role on Custom Interactive Component
**Severity**: WARN | **Languages**: TypeScript (TSX), JavaScript (JSX) | **Source**: CCC

**What it prohibits**: Custom interactive components (dropdowns, modals, tabs,
accordions) that have no ARIA role, no `aria-label`/`aria-labelledby`, and no
`aria-expanded`/`aria-selected` state management.

**Prohibited patterns**:
```tsx
// Custom dropdown with no ARIA attributes
<div className="dropdown" onClick={toggleOpen}>
  {isOpen && <ul className="dropdown-menu">{items}</ul>}
</div>

// Tab panel with no role or labelling
<div className="tab-panel">{content}</div>

// Modal overlay with no dialog role
<div className="modal-overlay">
  <div className="modal-content">{children}</div>
</div>
```

**Required patterns**:
```tsx
// Dropdown with proper ARIA
<div role="combobox" aria-expanded={isOpen} aria-label="Select option">
  {isOpen && <ul role="listbox">{items}</ul>}
</div>

// Tab panel with role and labelling
<div role="tabpanel" aria-labelledby="tab-1">{content}</div>

// Modal with dialog role
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm Action</h2>
  {children}
</div>
```

**Exemptions**:
- Components that wrap native HTML elements which inherit their ARIA semantics
  automatically (e.g., `<select>` wrapped in a styled container)
- Third-party accessible component libraries (Radix, Headless UI, React Aria)
  that handle ARIA internally

**Detection**:
1. Grep for common interactive pattern names (`Modal`, `Dropdown`, `Accordion`,
   `Tab`, `Tooltip`, `Popover`, `Dialog`, `Menu`) in component definitions
2. For each match: check if the component's root element has `role=`, `aria-label`,
   `aria-labelledby`, or `aria-expanded`
3. Flag components with interactive behavior but no ARIA attributes

**agent_action**:
1. Cite: `A11Y-3 (WARN): Custom interactive component at {file}:{line} has no ARIA attributes.`
2. Show the component
3. Propose minimum ARIA attributes:
   | Component | Minimum ARIA |
   |-----------|-------------|
   | Dropdown | `role="combobox"`, `aria-expanded` |
   | Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
   | Tab | `role="tab"`, `aria-selected` |
   | Tab Panel | `role="tabpanel"`, `aria-labelledby` |
   | Accordion | `role="region"`, `aria-expanded` on trigger |
   | Tooltip | `role="tooltip"`, trigger gets `aria-describedby` |
4. If `--fix`: add the minimum ARIA attributes to the component root element

---

### A11Y-4 — Keyboard-Inaccessible Interactive Element
**Severity**: BLOCK | **Languages**: TypeScript (TSX), JavaScript (JSX) | **Source**: CCC

**What it prohibits**: Elements with click handlers but no keyboard handler
(`onKeyDown`, `onKeyUp`, `onKeyPress`) and no `tabIndex`. Keyboard users
cannot reach or activate these elements.

**Prohibited patterns**:
```tsx
// div with click handler but no keyboard support
<div onClick={handleClick}>Click me</div>

// span with click handler but no keyboard support
<span onClick={handleAction} className="link">Learn more</span>

// Custom card component with click but no keyboard access
<div onClick={() => navigate('/details')} className="card">
  <h3>{title}</h3>
  <p>{description}</p>
</div>
```

**Exemptions**:
- Disabled elements (`disabled` attribute or `aria-disabled="true"`)
- Elements that are children of a focusable parent that handles keyboard events
- Native `<button>` and `<a href>` elements (inherently keyboard accessible)
- Elements with `role="presentation"` that are not meant to be interactive

**Detection**:
1. Grep for `onClick={` on non-button/non-anchor elements in `.tsx` and `.jsx` files
2. For each match: check if the same element has `onKeyDown`, `onKeyUp`, or
   `onKeyPress` attributes
3. Check if the element has a `tabIndex` attribute
4. Flag elements with `onClick` but no keyboard equivalent and no `tabIndex`

**agent_action**:
1. Cite: `A11Y-4 (BLOCK): Element at {file}:{line} has onClick but no keyboard handler — keyboard users cannot activate it.`
2. Show the element
3. Required action — choose the appropriate pattern:
   ```tsx
   // Best: convert to semantic button
   <button onClick={handleClick}>Click me</button>

   // If button is not appropriate: add tabIndex and keyboard handler
   <div
     onClick={handleClick}
     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }}
     tabIndex={0}
     role="button"
   >
     Click me
   </div>
   ```
4. If `--fix`: prefer converting to `<button>` over adding `tabIndex` +
   `onKeyDown` — only use the latter when a button element would break layout
   or styling constraints

**Bypass prohibition**: "Mouse users don't need keyboard support"
→ Refuse. Cite A11Y-4. WCAG 2.1.1 requires all functionality to be operable
through a keyboard interface.

---

### A11Y-5 — Missing Form Label Association
**Severity**: BLOCK | **Languages**: TypeScript (TSX), JavaScript (JSX) | **Source**: CCC

**What it prohibits**: Form inputs (`<input>`, `<select>`, `<textarea>`) with
no associated label. Screen readers cannot identify unlabeled form controls.
Placeholder text is not a label substitute.

**Prohibited patterns**:
```tsx
// Input with only placeholder — not accessible
<input type="text" placeholder="Enter your name" />

// Select with no label
<select>
  <option value="a">Option A</option>
</select>

// Textarea identified only by surrounding text
<p>Comments:</p>
<textarea rows={4} />
```

**Required patterns**:
```tsx
// Explicit label with htmlFor
<label htmlFor="name">Full Name</label>
<input id="name" type="text" placeholder="Enter your name" />

// aria-label for visually hidden labels
<input type="search" aria-label="Search products" placeholder="Search..." />

// aria-labelledby for complex label relationships
<h2 id="billing-heading">Billing Address</h2>
<input aria-labelledby="billing-heading" type="text" />

// Wrapping label (implicit association)
<label>
  Email
  <input type="email" />
</label>
```

**Exemptions**:
- `<input type="hidden">` — hidden inputs are not presented to users
- Inputs with `aria-label` or `aria-labelledby` explicitly set
- Inputs nested inside a `<label>` element (implicit association)
- Submit/reset buttons (`<input type="submit">`, `<input type="reset">`)

**Detection**:
1. Grep for `<input`, `<select`, `<textarea` in `.tsx` and `.jsx` files
2. For each match: check if the element has `aria-label` or `aria-labelledby`
3. Check if an `id` attribute exists and a `<label htmlFor=` matches it
4. Check if the input is nested inside a `<label>` element
5. Flag inputs with no label association of any kind

**agent_action**:
1. Cite: `A11Y-5 (BLOCK): Form input at {file}:{line} has no associated label — screen readers cannot identify it.`
2. Show the unlabeled input
3. Required action — choose the appropriate pattern:
   ```tsx
   // Preferred: explicit label
   <label htmlFor="email">Email Address</label>
   <input id="email" type="email" />

   // Alternative: aria-label for search/icon inputs
   <input type="search" aria-label="Search products" />
   ```
4. If `--fix`: add `aria-label="TODO: describe input purpose"` — require human
   to provide the actual label text

**Bypass prohibition**: "The placeholder explains it"
→ Refuse. Cite A11Y-5. Placeholder text disappears on focus and is not reliably
announced by screen readers. A proper `<label>` or `aria-label` is required.

---

Report schema: see `skills/conductor/shared-contracts.md`.
