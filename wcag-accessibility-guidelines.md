# WCAG Accessibility Implementation Guidelines
## React + Node.js Frontend — Accessibility Standards

> **Scope:** This document defines accessibility implementation rules based on the **Web Content Accessibility Guidelines (WCAG) 2.1** at **Level AA** conformance. All frontend code — whether hand-written or AI-assisted — must meet these standards. WCAG 2.2 additions are noted where applicable.

---

## Table of Contents

1. [WCAG Principles Overview](#1-wcag-principles-overview)
2. [Perceivable](#2-perceivable)
   - 2.1 Text Alternatives
   - 2.2 Time-Based Media
   - 2.3 Adaptable Content
   - 2.4 Distinguishable Content
3. [Operable](#3-operable)
   - 3.1 Keyboard Accessible
   - 3.2 Enough Time
   - 3.3 Seizures & Physical Reactions
   - 3.4 Navigable
4. [Understandable](#4-understandable)
   - 4.1 Readable
   - 4.2 Predictable
   - 4.3 Input Assistance
5. [Robust](#5-robust)
   - 5.1 Compatible
6. [React Implementation Patterns](#6-react-implementation-patterns)
7. [Component-Level Checklist](#7-component-level-checklist)
8. [Testing & Tooling](#8-testing--tooling)
9. [WCAG 2.2 Additions](#9-wcag-22-additions)
10. [Quick Reference Checklist](#10-quick-reference-checklist)

---

## 1. WCAG Principles Overview

WCAG is organized around four core principles — **POUR**:

| Principle | What it means |
|---|---|
| **Perceivable** | Information must be presentable in ways all users can perceive |
| **Operable** | UI components and navigation must be operable by all users |
| **Understandable** | Information and UI operation must be understandable |
| **Robust** | Content must be robust enough to be interpreted by assistive technologies |

**Conformance Target for this project: WCAG 2.1 Level AA**

Each guideline below maps to a specific WCAG Success Criterion (SC) number for traceability.

---

## 2. Perceivable

### 2.1 Text Alternatives *(SC 1.1.1)*

Every non-text element must have a text alternative that conveys the same information.

**Images**

```tsx
// ✅ Informative image — describe what it conveys
<img src="/charts/revenue-q4.png" alt="Bar chart showing Q4 revenue of $2.4M, up 18% from Q3" />

// ✅ Decorative image — empty alt suppresses it from screen readers
<img src="/decorations/wave-divider.svg" alt="" role="presentation" />

// ❌ Missing alt — screen reader reads the filename
<img src="/icons/warning.png" />
```

**Icon Buttons**

```tsx
// ✅ Icon-only button — label via aria-label
<button aria-label="Delete account">
  <TrashIcon aria-hidden="true" />
</button>

// ✅ Icon with visible text — hide icon from screen reader
<button>
  <SearchIcon aria-hidden="true" />
  <span>Search</span>
</button>
```

**SVG Icons**

```tsx
// ✅ Standalone SVG used as image
<svg role="img" aria-label="Warning: unsaved changes" focusable="false">
  <use href="#icon-warning" />
</svg>

// ✅ Decorative SVG
<svg aria-hidden="true" focusable="false">
  <use href="#icon-decorative" />
</svg>
```

**Rules:**
- Never use `alt="image"`, `alt="photo"`, or the filename as alt text.
- Alt text should convey purpose and context, not just describe appearance.
- Complex images (charts, diagrams) require a longer description — use `aria-describedby` linking to a nearby paragraph.

---

### 2.2 Time-Based Media *(SC 1.2.x)*

| Media Type | Requirement |
|---|---|
| Prerecorded audio | Provide text transcript (SC 1.2.1) |
| Prerecorded video | Provide captions + audio description (SC 1.2.2, 1.2.3) |
| Live audio/video | Provide live captions (SC 1.2.4) |

**Rules:**
- Auto-playing media is **prohibited** unless it is muted and shorter than 3 seconds.
- Provide user controls to pause, stop, or mute any auto-playing media.
- Captions must be synchronized, accurate, and include speaker identification.

---

### 2.3 Adaptable Content *(SC 1.3.x)*

Content must be presentable in different ways without losing information.

**Semantic HTML — Always Use the Right Element**

```tsx
// ✅ Semantic structure
<header>
  <nav aria-label="Main navigation">...</nav>
</header>
<main>
  <article>
    <h1>Page Title</h1>
    <section aria-labelledby="section-heading">
      <h2 id="section-heading">Section Title</h2>
      <p>Content...</p>
    </section>
  </article>
</main>
<footer>...</footer>

// ❌ Div soup — no structure for assistive technologies
<div class="header">
  <div class="nav">...</div>
</div>
<div class="main">
  <div class="title">Page Title</div>
</div>
```

**Heading Hierarchy (SC 1.3.1)**

- Use headings to convey document structure, not visual styling.
- Never skip heading levels (e.g., h1 → h3).
- Each page must have exactly **one `<h1>`**.

```tsx
// ✅ Correct heading hierarchy
<h1>Dashboard</h1>
  <h2>Revenue Overview</h2>
    <h3>Monthly Breakdown</h3>
  <h2>User Activity</h2>

// ❌ Skipped level
<h1>Dashboard</h1>
  <h3>Revenue Overview</h3>  {/* jumped from h1 to h3 */}
```

**Reading Order (SC 1.3.2)**

- The DOM order must match the visual reading order.
- Never use CSS to visually reorder content if it changes meaning (e.g., `order` in flexbox or CSS Grid for main content flow).

**Sensory Instructions (SC 1.3.3)**

- Never rely solely on sensory characteristics to convey information.

```tsx
// ❌ Shape/position only
<p>Click the round button on the right to continue.</p>

// ✅ Name it
<p>Click the <strong>Submit</strong> button to continue.</p>
```

**Orientation (SC 1.3.4)**

- Do not lock content to portrait or landscape orientation unless essential.

**Input Purpose (SC 1.3.5)**

- All user input fields collecting personal data must have an `autocomplete` attribute.

```tsx
<input type="text" name="name" autocomplete="name" />
<input type="email" name="email" autocomplete="email" />
<input type="tel" name="phone" autocomplete="tel" />
<input type="new-password" name="password" autocomplete="new-password" />
```

---

### 2.4 Distinguishable Content *(SC 1.4.x)*

**Color Contrast (SC 1.4.3 — AA, SC 1.4.6 — AAA)**

| Text Type | Minimum Ratio (AA) | Enhanced Ratio (AAA) |
|---|---|---|
| Normal text (< 18pt / < 14pt bold) | **4.5 : 1** | 7 : 1 |
| Large text (≥ 18pt / ≥ 14pt bold) | **3 : 1** | 4.5 : 1 |
| UI components & icons | **3 : 1** | — |

```css
/* ✅ Check your theme variables meet contrast ratios */
:root {
  --color-text-primary: #1a1a2e;      /* on white: 16.1:1 ✅ */
  --color-text-secondary: #4a4a6a;    /* on white: 7.2:1 ✅ */
  --color-text-disabled: #9999aa;     /* on white: 2.8:1 — disabled states exempt */
  --color-interactive: #1d6fce;       /* on white: 4.7:1 ✅ */
  --color-danger: #c0392b;            /* on white: 5.1:1 ✅ */
}
```

- Use **Colour Contrast Analyser** or the browser DevTools accessibility panel to verify all color pairs.
- Disabled elements are exempt from contrast requirements — but keep them reasonably perceivable.

**Don't Use Color Alone (SC 1.4.1)**

```tsx
// ❌ Color only to indicate status
<span style={{ color: 'red' }}>Error</span>

// ✅ Color + icon + text
<span className="text-red-600" role="alert">
  <ErrorIcon aria-hidden="true" />
  <span>Error: Email is required</span>
</span>
```

**Text Resize (SC 1.4.4)**

- All text must remain readable and functional when resized up to **200%** by the browser.
- Use relative units (`rem`, `em`) for font sizes — never `px` for text.

```css
/* ✅ Relative units scale with user preferences */
body { font-size: 1rem; }        /* respects browser base size */
h1   { font-size: 2rem; }
p    { font-size: 1rem; line-height: 1.6; }

/* ❌ Pixel font sizes override user settings */
body { font-size: 16px; }
```

**Reflow (SC 1.4.10)**

- Content must reflow into a single column at **320px viewport width** without horizontal scrolling.
- Do not use fixed-width layouts that break on narrow screens.

**Non-Text Contrast (SC 1.4.11)**

- UI component boundaries (input borders, button outlines, focus indicators) need at least **3:1** contrast against their adjacent background.

```css
/* ✅ Input border clearly visible against white */
input {
  border: 2px solid #767676; /* 4.6:1 on white ✅ */
}
```

**Text Spacing (SC 1.4.12)**

- Content must not break or lose information when the following spacing overrides are applied:
  - Line height ≥ 1.5× font size
  - Letter spacing ≥ 0.12× font size
  - Word spacing ≥ 0.16× font size
  - Paragraph spacing ≥ 2× font size

**No Audio on Hover (SC 1.4.2)**

- Any audio that starts automatically must be controllable or stoppable by the user.

---

## 3. Operable

### 3.1 Keyboard Accessible *(SC 2.1.x)*

**All functionality must be available via keyboard alone.**

**Focus Management Rules**

- Every interactive element must be reachable via `Tab` and operable via `Enter`/`Space`.
- Never remove focus outlines with `outline: none` without providing a **visible custom focus style**.
- Focus order must be logical and follow the reading order.

```css
/* ✅ Custom focus style — visible and branded */
:focus-visible {
  outline: 3px solid #1d6fce;
  outline-offset: 2px;
  border-radius: 4px;
}

/* ❌ Removing focus — keyboard users are blind to their location */
* { outline: none; }
button:focus { outline: none; }
```

**No Keyboard Traps (SC 2.1.2)**

- Keyboard focus must never be locked in a component. Users must always be able to navigate away using standard keys.
- Exception: modals and dialogs intentionally trap focus — but must release it on Escape.

```tsx
// ✅ Modal — traps focus inside, releases on Escape
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Trap focus using focus-trap-react or manual implementation
      const focusableEls = modalRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusableEls[0]?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return isOpen ? (
    <div role="dialog" aria-modal="true" ref={modalRef}>
      {children}
    </div>
  ) : null;
}
```

**Keyboard Shortcuts (SC 2.1.4)**

- Custom single-character keyboard shortcuts must be remappable or disableable by users.

---

### 3.2 Enough Time *(SC 2.2.x)*

- Session timeouts must warn users at least **20 seconds** before expiry and allow them to extend the session.
- Any moving, scrolling, or auto-updating content lasting more than 3 seconds must have pause/stop controls.

```tsx
// ✅ Session timeout warning
function SessionWarning({ timeLeft, onExtend }) {
  return (
    <div role="alertdialog" aria-labelledby="session-warning-title" aria-describedby="session-warning-desc">
      <h2 id="session-warning-title">Session Expiring</h2>
      <p id="session-warning-desc">Your session expires in {timeLeft} seconds.</p>
      <button onClick={onExtend}>Stay Logged In</button>
    </div>
  );
}
```

---

### 3.3 Seizures & Physical Reactions *(SC 2.3.x)*

- **Never** include content that flashes more than **3 times per second** (SC 2.3.1).
- Animations that cover a large portion of the screen require special care.
- Always respect the user's `prefers-reduced-motion` media query.

```css
/* ✅ Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```tsx
// ✅ React hook for reduced motion
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
```

---

### 3.4 Navigable *(SC 2.4.x)*

**Skip Navigation Link (SC 2.4.1)**

- Provide a visible skip link as the first focusable element to bypass repeated navigation.

```tsx
// ✅ Skip nav — visible on focus, hidden otherwise
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
             focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
>
  Skip to main content
</a>

<main id="main-content" tabIndex={-1}>
  {/* Page content */}
</main>
```

**Page Title (SC 2.4.2)**

- Every page must have a unique, descriptive `<title>` that includes the page name and app name.

```tsx
// ✅ Dynamic page titles with React Helmet or router meta
import { Helmet } from 'react-helmet-async';

export function DashboardPage() {
  return (
    <>
      <Helmet>
        <title>Dashboard — MyApp</title>
      </Helmet>
      {/* ... */}
    </>
  );
}
```

**Focus Order (SC 2.4.3)**

- Tab order must follow a logical sequence matching the visual layout.
- Avoid positive `tabindex` values (e.g., `tabindex="2"`) — they disrupt natural DOM order.
- Use `tabindex="0"` to add custom elements to the tab order; `tabindex="-1"` for programmatic focus only.

```tsx
// ❌ Positive tabindex disrupts tab order
<button tabIndex={3}>First visually</button>
<button tabIndex={1}>Second visually</button>

// ✅ Rely on DOM order
<button>First in DOM, first in tab order</button>
<button>Second in DOM, second in tab order</button>
```

**Link & Button Purpose (SC 2.4.4 / SC 2.4.6)**

- Link and button text must clearly describe the action or destination — never use "click here" or "read more" alone.

```tsx
// ❌ Ambiguous link text
<a href="/reports/q4">Click here</a>

// ✅ Descriptive link text
<a href="/reports/q4">Download Q4 Report (PDF)</a>

// ✅ Or use aria-label to augment short visible text
<a href="/reports/q4" aria-label="Download Q4 2024 report PDF">
  Download Report
</a>
```

**Visible Focus (SC 2.4.7)**

- The keyboard focus indicator must be visible at all times.
- Focus indicator must have at least **3:1** contrast against adjacent colors (WCAG 2.2: SC 2.4.11 raises this to a specific minimum area).

**Location Breadcrumbs (SC 2.4.8)**

- Provide breadcrumbs or other location indicators for multi-level page hierarchies.

```tsx
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/settings">Settings</a></li>
    <li><span aria-current="page">Profile</span></li>
  </ol>
</nav>
```

---

## 4. Understandable

### 4.1 Readable *(SC 3.1.x)*

**Language Declaration (SC 3.1.1 & 3.1.2)**

- Always declare the page language in `<html>`.
- Mark inline content in a different language with `lang` attribute.

```html
<!-- In index.html -->
<html lang="en">

<!-- Inline foreign language -->
<p>The French term is <span lang="fr">joie de vivre</span>.</p>
```

---

### 4.2 Predictable *(SC 3.2.x)*

**No Unexpected Context Changes (SC 3.2.1 / 3.2.2)**

- Focus on an element must not trigger unexpected actions.
- Changing a form control (e.g., a `<select>`) must not auto-submit or navigate without user confirmation.

```tsx
// ❌ Immediate navigation on select change
<select onChange={(e) => navigate(e.target.value)}>

// ✅ Require explicit confirmation
<select onChange={(e) => setSelected(e.target.value)}>
<button onClick={() => navigate(selected)}>Go</button>
```

**Consistent Navigation (SC 3.2.3)**

- Navigation menus must appear in the same location and order across all pages.

**Consistent Identification (SC 3.2.4)**

- Components with the same function must be identified consistently across pages (same label, same icon).

---

### 4.3 Input Assistance *(SC 3.3.x)*

**Error Identification (SC 3.3.1)**

- If a submission error is detected, identify the field with the error and describe it in text.

```tsx
// ✅ Accessible form error
<div>
  <label htmlFor="email">Email address</label>
  <input
    id="email"
    type="email"
    aria-describedby="email-error"
    aria-invalid={!!errors.email}
  />
  {errors.email && (
    <p id="email-error" role="alert" className="text-red-600 text-sm">
      {errors.email.message}
    </p>
  )}
</div>
```

**Labels and Instructions (SC 3.3.2)**

- Every form input must have a visible label — never rely on placeholder text alone.
- Provide format instructions before the input (e.g., "Date format: MM/DD/YYYY").

```tsx
// ❌ Placeholder only — disappears on input, no persistent label
<input type="text" placeholder="Enter your email" />

// ✅ Visible label + helpful hint
<label htmlFor="email">
  Email address
  <span className="text-gray-500 text-sm ml-1">(e.g. you@example.com)</span>
</label>
<input id="email" type="email" />
```

**Error Suggestion (SC 3.3.3)**

- When an error is detected and a suggestion is known, provide the suggestion in the error message.

```tsx
// ✅ Actionable error message
<p role="alert">
  Invalid date format. Please use MM/DD/YYYY (e.g., 04/15/2024).
</p>
```

**Error Prevention (SC 3.3.4)**

- For legal, financial, or data-submission actions: provide at least one of:
  - A review step before final submission
  - The ability to undo or cancel after submission
  - A confirmation dialog before irreversible actions

```tsx
// ✅ Confirmation before destructive action
function DeleteAccountButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <button onClick={() => setConfirmOpen(true)}>Delete Account</button>
      {confirmOpen && (
        <ConfirmDialog
          title="Delete your account?"
          description="This action is permanent and cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
```

---

## 5. Robust

### 5.1 Compatible *(SC 4.1.x)*

**Valid HTML (SC 4.1.1)**

- Elements must have complete start and end tags.
- Elements must be nested correctly per spec.
- No duplicate `id` attributes on a page.
- Attributes must not be duplicated on the same element.

**Name, Role, Value (SC 4.1.2)**

- All UI components must have an accessible name, role, and state that can be determined programmatically.

```tsx
// ✅ Custom toggle with correct role and state
<button
  role="switch"
  aria-checked={isOn}
  aria-label="Enable email notifications"
  onClick={toggle}
>
  <span aria-hidden="true">{isOn ? 'On' : 'Off'}</span>
</button>

// ✅ Expandable section
<button
  aria-expanded={isOpen}
  aria-controls="faq-answer-1"
>
  What is your return policy?
</button>
<div id="faq-answer-1" hidden={!isOpen}>
  You can return items within 30 days.
</div>
```

**Status Messages (SC 4.1.3)**

- Status messages (success, error, loading) must be conveyed to assistive technologies without requiring focus.

```tsx
// ✅ Live region for dynamic status messages
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>

// ✅ For urgent errors — use assertive
<div aria-live="assertive" aria-atomic="true" className="sr-only">
  {errorMessage}
</div>
```

**Use `aria-live` Levels Correctly**

| Level | Use Case |
|---|---|
| `polite` | Non-urgent updates: success messages, item counts, search results |
| `assertive` | Urgent alerts: critical errors, session expiry, destructive action results |

---

## 6. React Implementation Patterns

### 6.1 Accessible Custom Components

**Accordion**

```tsx
function AccordionItem({ id, title, children }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <h3>
        <button
          aria-expanded={isOpen}
          aria-controls={`panel-${id}`}
          id={`header-${id}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {title}
          <ChevronIcon aria-hidden="true" className={isOpen ? 'rotate-180' : ''} />
        </button>
      </h3>
      <div
        id={`panel-${id}`}
        role="region"
        aria-labelledby={`header-${id}`}
        hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}
```

**Tab Panel**

```tsx
function Tabs({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <div>
      <div role="tablist" aria-label="Content sections">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeIndex === i}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeIndex === i ? 0 : -1}
            onClick={() => setActiveIndex(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeIndex !== i}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

**Alert / Toast**

```tsx
// Toasts must be announced to screen readers without stealing focus
function ToastContainer({ toasts }) {
  return (
    <div aria-live="polite" aria-relevant="additions" className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="status"
          className={`toast toast--${toast.type}`}
        >
          <span aria-hidden="true"><toast.icon /></span>
          <span>{toast.message}</span>
          <button aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
            <CloseIcon aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 6.2 Screen Reader Utilities

```tsx
// Visually hidden but accessible to screen readers
// Use for: skip links (hidden until focused), live regions, supplemental context

// Tailwind utility class approach
// Add to tailwind.config.ts as a custom class
// .sr-only { position: absolute; width: 1px; height: 1px; ... }

// Usage
<span className="sr-only">Current page: </span>
<span aria-current="page">Dashboard</span>
```

---

## 7. Component-Level Checklist

Use this checklist when reviewing any new or updated component:

### Buttons & Links

- [ ] Has a descriptive accessible name (text content or `aria-label`)
- [ ] `<button>` used for actions; `<a href>` used for navigation
- [ ] Focus style is visible and meets 3:1 contrast
- [ ] Icon-only buttons have `aria-label`; icons have `aria-hidden="true"`

### Forms

- [ ] Every input has a visible `<label>` with matching `htmlFor`/`id`
- [ ] Placeholder is supplementary only — not the sole label
- [ ] Required fields marked with `aria-required="true"` and a visible indicator
- [ ] Error messages linked via `aria-describedby` and use `role="alert"` or `aria-live`
- [ ] `aria-invalid="true"` set on fields with errors
- [ ] `autocomplete` attributes set on personal data inputs

### Images

- [ ] All `<img>` have `alt` attribute
- [ ] Informative images have descriptive alt text
- [ ] Decorative images have `alt=""` and optionally `role="presentation"`
- [ ] Complex images (charts) have extended descriptions

### Modal / Dialog

- [ ] `role="dialog"` and `aria-modal="true"` set
- [ ] Titled with `aria-labelledby` pointing to the dialog heading
- [ ] Focus trapped inside while open
- [ ] Focus returns to trigger element on close
- [ ] Closable via Escape key

### Navigation

- [ ] Skip-to-main-content link is first focusable element
- [ ] `<nav>` has `aria-label` to differentiate multiple nav regions
- [ ] Current page link has `aria-current="page"`
- [ ] Breadcrumbs wrapped in `<nav aria-label="Breadcrumb">`

### Dynamic Content

- [ ] Status messages use `aria-live="polite"`
- [ ] Error alerts use `aria-live="assertive"`
- [ ] Loading states announced to screen readers
- [ ] Page title updates on route change

---

## 8. Testing & Tooling

### 8.1 Automated Testing

| Tool | Stage | What It Catches |
|---|---|---|
| **eslint-plugin-jsx-a11y** | Development | Missing alts, invalid ARIA, misused elements |
| **axe-core / @axe-core/react** | Development | ~57% of WCAG failures automatically |
| **jest-axe** | Unit/Integration tests | Accessibility violations in component tests |
| **Playwright + axe** | E2E | Full-page accessibility at integration level |
| **Lighthouse CI** | CI/CD pipeline | Accessibility score regression gate |

**jest-axe Example**

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('LoginForm has no accessibility violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 8.2 Manual Testing

These issues cannot be caught by automated tools and **must** be manually tested:

- Keyboard navigation flow through each page
- Screen reader announcements (test with NVDA + Firefox, VoiceOver + Safari)
- Logical focus order and focus trap behaviour in modals
- Color contrast of dynamic/themed states (hover, focus, active)
- Session timeout warning and extension flow
- Motion/animation with `prefers-reduced-motion` enabled

### 8.3 Screen Reader Testing Matrix

| Screen Reader | Browser | Platform |
|---|---|---|
| NVDA | Firefox | Windows |
| JAWS | Chrome / Edge | Windows |
| VoiceOver | Safari | macOS / iOS |
| TalkBack | Chrome | Android |

---

## 9. WCAG 2.2 Additions

WCAG 2.2 (published October 2023) adds the following new success criteria at AA:

| SC | Name | What Changed |
|---|---|---|
| **2.4.11** | Focus Appearance (Minimum) | Focus indicator must have minimum area (perimeter × 2px) and 3:1 contrast change |
| **2.4.12** | Focus Appearance (Enhanced) | Stricter focus indicator rules at AAA |
| **2.4.13** | Focus Appearance | Consolidated from drafts — now requires visible focus with specific size/contrast |
| **2.5.7** | Dragging Movements | All drag functionality needs a single-pointer alternative |
| **2.5.8** | Target Size (Minimum) | Touch targets must be at least **24×24 CSS pixels** (AA); 44×44 is still best practice |
| **3.2.6** | Consistent Help | Help mechanisms (chat, contact link) must appear in consistent locations |
| **3.3.7** | Redundant Entry | Don't ask users to re-enter information already provided in the same session |
| **3.3.8** | Accessible Authentication | No cognitive tests (CAPTCHAs) for authentication without an accessible alternative |

**Practical Impact:**

```css
/* WCAG 2.2 SC 2.5.8 — Minimum touch target size */
button, a, input[type="checkbox"], input[type="radio"] {
  min-width: 24px;
  min-height: 24px;
}

/* Best practice — 44×44px for comfortable touch targets */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

---

## 10. Quick Reference Checklist

### Per-Page Audit

- [ ] Page has a unique, descriptive `<title>`
- [ ] `<html lang="...">` is set correctly
- [ ] One `<h1>` per page; heading hierarchy is logical and unbroken
- [ ] Skip-to-content link is the first focusable element
- [ ] All images have appropriate `alt` text
- [ ] All interactive elements reachable and operable by keyboard
- [ ] Focus indicator is visible on all interactive elements
- [ ] All text meets 4.5:1 contrast ratio (3:1 for large text)
- [ ] No information conveyed by color alone
- [ ] All form inputs have visible labels
- [ ] Form errors are descriptive, associated with inputs, and announced
- [ ] Dynamic updates announced via `aria-live`
- [ ] Animations respect `prefers-reduced-motion`
- [ ] No content flashes more than 3 times per second
- [ ] `axe` scan returns zero violations
- [ ] Passes keyboard-only navigation test

### Pre-Release Gate

- [ ] Automated `axe` tests pass in CI
- [ ] Lighthouse accessibility score ≥ 90
- [ ] Manual keyboard navigation test completed
- [ ] Manual screen reader test completed (NVDA + VoiceOver minimum)
- [ ] Color contrast verified with Colour Contrast Analyser
- [ ] Reduced motion behaviour verified

---

## References

- [WCAG 2.1 Full Specification](https://www.w3.org/TR/WCAG21/)
- [WCAG 2.2 Full Specification](https://www.w3.org/TR/WCAG22/)
- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM: Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Deque axe-core](https://github.com/dequelabs/axe-core)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Inclusive Components](https://inclusive-components.design/)

---

*Document version: 1.0 — This document should be reviewed whenever WCAG publishes a new version or when the component library is significantly updated.*
