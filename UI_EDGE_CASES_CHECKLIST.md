# UI Edge Cases & Commonly Missed Design Details (AI Checklist)

## Overview

This document outlines commonly overlooked UI/UX details that can significantly impact the quality and usability of your application. 
Many of these issues are subtle but compound to create a poor user experience. 
AI-generated code often misses these edge cases, so this checklist serves as a validation tool during development.

---

## 1. Border Radius + Border Issues

### Problem

Borders don't follow border-radius, creating misaligned visual corners. Child elements may bleed outside rounded corners.

### Solution

- Ensure borders follow border-radius (no corner clipping)
- Use `overflow: hidden` when needed for child elements
- Avoid background bleeding outside rounded corners
- Verify on:
  - Cards
  - Images inside cards
  - Buttons with borders
  - Input fields

### Code Example

```css
/* ✅ Correct: Border-radius applied properly */
.card {
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden; /* Prevents child overflow */
  background: white;
}

.card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.card-content {
  padding: 16px;
}

/* ❌ Incorrect: No overflow hidden, borders don't align with radius */
.bad-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  /* Missing overflow: hidden */
}

/* ❌ Incorrect: Background bleeds outside border-radius */
.bad-button {
  border-radius: 4px;
  background: linear-gradient(to right, #007bff, #0056b3);
  border: 1px solid transparent;
  /* Background may bleed at edges */
}
```

### Checklist

- [ ] Cards have `overflow: hidden`
- [ ] Images inside cards respect border-radius
- [ ] Buttons with borders are properly aligned
- [ ] No visual gaps between border and radius
- [ ] Child backgrounds don't bleed outside corners

---

## 2. Background Overlay (Modals / Popups)

### Problem

Modals appear without overlay, background isn't dimmed, or background can still scroll behind modal.

### Solution

- Always include overlay behind modal
- Overlay must:
  - Cover full screen (100vw × 100vh)
  - Prevent background scroll
  - Close modal on outside click (optional but recommended)
- Add blur/dim effect with `rgba(0,0,0,0.5)` or `backdrop-filter: blur()`

### Code Example

```html
<!-- ✅ Correct: Modal with overlay -->
<div class="modal-overlay" data-testid="overlay">
  <div class="modal" role="dialog" aria-modal="true">
    <header>
      <h2>Modal Title</h2>
      <button aria-label="Close modal" onclick="closeModal()">✕</button>
    </header>
    <div class="modal-content">
      Content here...
    </div>
  </div>
</div>
```

```css
/* ✅ Correct: Overlay styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 1000;
}

body.modal-open {
  overflow: hidden; /* Prevent background scroll */
}

/* ❌ Incorrect: No overlay */
.bad-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* Missing overlay behind modal */
}

/* ❌ Incorrect: Overlay doesn't cover full screen */
.bad-overlay {
  position: absolute; /* Should be fixed */
  background: rgba(0, 0, 0, 0.3);
  width: 500px; /* Should be 100vw */
  height: 500px; /* Should be 100vh */
}
```

```javascript
// ✅ Correct: Manage modal state
const openModal = () => {
  document.body.style.overflow = 'hidden';
  document.querySelector('.modal-overlay').style.display = 'flex';
};

const closeModal = () => {
  document.body.style.overflow = 'auto';
  document.querySelector('.modal-overlay').style.display = 'none';
};

// Close on outside click
document.querySelector('.modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    closeModal();
  }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});
```

### Checklist

- [ ] Overlay covers full screen
- [ ] Background scroll prevented when modal open
- [ ] Overlay has semi-transparent dark color
- [ ] Modal appears above overlay
- [ ] Click outside closes modal (if designed)
- [ ] Escape key closes modal
- [ ] Proper z-index values

---

## 3. Button Loading State (API Calls)

### Problem

Button doesn't show loading state, allows multiple clicks, or layout shifts during loading.

### Solution

- Show loader/spinner inside button
- Disable button while loading
- Prevent multiple clicks
- Maintain button width (avoid layout shift)
- Show clear loading text/spinner

### Code Example

```jsx
// ✅ Correct: Button with loading state
const SubmitButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (isLoading) return; // Prevent multiple clicks
    
    setIsLoading(true);
    try {
      await submitForm();
      // Success feedback
    } catch (error) {
      // Error feedback
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={isLoading}
      aria-busy={isLoading}
      className="button"
      style={{ minWidth: '120px' }} // Maintain width
    >
      {isLoading ? (
        <>
          <Spinner aria-hidden="true" />
          <span>Submitting...</span>
        </>
      ) : (
        'Submit'
      )}
    </button>
  );
};
```

```css
/* ✅ Correct: Button loading styles */
.button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 120px; /* Maintain width */
  justify-content: center;
  transition: background 0.2s;
}

.button:hover:not(:disabled) {
  background: #0056b3;
}

.button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

/* Spinner animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
}

/* ❌ Incorrect: No loading state */
.bad-button {
  padding: 12px 24px;
  /* No width maintenance, allows multiple clicks */
}

/* ❌ Incorrect: Layout shift during loading */
.bad-button-loading {
  padding: 12px 24px;
  /* If text changes, button width changes too */
}
```

### Checklist

- [ ] Button shows loading indicator
- [ ] Button disabled during loading
- [ ] Button width doesn't change during loading
- [ ] Multiple clicks prevented
- [ ] Clear loading text or spinner
- [ ] Proper state management

---

## 4. Hover / Focus / Active States

### Problem

Interactive elements missing hover, focus, or active states, making them appear unresponsive.

### Solution

Every interactive element must have:
- Hover state (mouse interaction)
- Focus state (keyboard navigation)
- Active state (being clicked)

Apply to: buttons, links, cards, inputs, etc.

### Code Example

```css
/* ✅ Correct: Complete interactive element styles */
button {
  /* Default state */
  background: #007bff;
  color: white;
  border: 2px solid transparent;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
}

button:hover {
  /* Hover state */
  background: #0056b3;
  box-shadow: 0 4px 12px rgba(0, 86, 179, 0.3);
}

button:focus-visible {
  /* Focus state (keyboard) */
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

button:active {
  /* Active state (being clicked) */
  background: #004085;
  transform: scale(0.98);
}

button:disabled {
  /* Disabled state */
  background: #ccc;
  color: #666;
  cursor: not-allowed;
  opacity: 0.6;
}

/* ✅ Correct: Link states */
a {
  color: #007bff;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.2s ease;
}

a:hover {
  color: #0056b3;
  border-bottom-color: #0056b3;
}

a:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
  border-radius: 2px;
}

a:active {
  color: #004085;
}

/* ✅ Correct: Card states */
.card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card:hover {
  border-color: #007bff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.1);
  transform: translateY(-2px);
}

.card:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* ❌ Incorrect: Missing hover/focus states */
.bad-button {
  background: #007bff;
  /* No hover, focus, or active states */
}

/* ❌ Incorrect: No visible focus state */
.bad-link {
  color: #007bff;
  text-decoration: none;
  /* No focus-visible style for keyboard users */
}
```

### Checklist

- [ ] Buttons have hover state
- [ ] Buttons have focus state (keyboard)
- [ ] Buttons have active state
- [ ] Links have hover state
- [ ] Links have focus state
- [ ] Cards have hover state (if clickable)
- [ ] All interactive elements have clear states
- [ ] Focus indicator is visible (contrast ≥ 2px)

---

## 5. Disabled States

### Problem

Disabled buttons don't look disabled, remain clickable, or have confusing styling.

### Solution

- Disabled buttons must look visually different
- Must not be clickable
- Use `cursor: not-allowed`
- Reduce opacity or change color
- Disable pointer events

### Code Example

```jsx
// ✅ Correct: Disabled button handling
<button
  disabled={!isFormValid}
  onClick={handleSubmit}
  aria-disabled={!isFormValid}
  className="button"
>
  {isFormValid ? 'Submit' : 'Fill required fields'}
</button>
```

```css
/* ✅ Correct: Disabled styling */
button:disabled {
  background-color: #ccc;
  color: #666;
  cursor: not-allowed;
  opacity: 0.6;
  border-color: #999;
  box-shadow: none;
  pointer-events: none;
}

button:disabled:hover {
  background-color: #ccc; /* Don't change on hover */
}

/* Alternative: Outline style */
button.outline:disabled {
  background: transparent;
  color: #ccc;
  border-color: #ccc;
  cursor: not-allowed;
}

/* ❌ Incorrect: Disabled button looks enabled */
.bad-disabled-button {
  background: #007bff;
  color: white;
  cursor: pointer; /* Should be not-allowed */
  /* No visual difference from enabled state */
}

/* ❌ Incorrect: Still clickable when disabled */
.bad-disabled-button {
  opacity: 0.5;
  /* But pointer-events not disabled, still clickable */
}
```

### Checklist

- [ ] Disabled buttons have different color
- [ ] Disabled buttons use `cursor: not-allowed`
- [ ] Disabled buttons have reduced opacity
- [ ] Disabled buttons don't respond to hover
- [ ] `pointer-events: none` applied
- [ ] Clear visual distinction from enabled state

---

## 6. Image Handling Issues

### Problem

Images distort, don't load, or have wrong aspect ratios. Missing fallback for broken images.

### Solution

- Prevent image distortion with `object-fit: cover`
- Handle missing images with fallback
- Support different aspect ratios
- Use proper `alt` text for accessibility
- Lazy load images

### Code Example

```html
<!-- ✅ Correct: Image with fallback and lazy loading -->
<picture>
  <source srcset="image-small.webp" media="(max-width: 640px)" type="image/webp" />
  <source srcset="image-large.webp" media="(min-width: 641px)" type="image/webp" />
  <img 
    src="image-fallback.jpg" 
    alt="Product image"
    loading="lazy"
    onerror="this.src='fallback-image.jpg'"
    class="product-image"
  />
</picture>
```

```css
/* ✅ Correct: Image sizing and fit */
.product-image {
  width: 100%;
  height: 300px;
  object-fit: cover; /* Prevent distortion */
  object-position: center;
  background: #f0f0f0; /* Placeholder while loading */
  border-radius: 8px;
}

.product-image.loading {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ✅ Correct: Image with aspect ratio -->
.thumbnail {
  aspect-ratio: 16 / 9;
  object-fit: cover;
  width: 100%;
}

/* ❌ Incorrect: Image distortion -->
.bad-image {
  width: 100%;
  height: 300px;
  /* No object-fit, image stretches */
}

/* ❌ Incorrect: No fallback for broken image -->
.bad-image {
  width: 100%;
  height: 300px;
  /* If image fails to load, blank space shown */
}
```

```jsx
// ✅ Correct: Image component with error handling
const Image = ({ src, alt, fallbackSrc = 'fallback.jpg' }) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setImageSrc(fallbackSrc);
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      onLoad={() => setIsLoading(false)}
      onError={handleError}
      className={`image ${isLoading ? 'loading' : ''}`}
      loading="lazy"
    />
  );
};
```

### Checklist

- [ ] Images use `object-fit: cover`
- [ ] Aspect ratio maintained
- [ ] Fallback image for broken images
- [ ] Lazy loading implemented
- [ ] Meaningful `alt` text provided
- [ ] Placeholder shown while loading
- [ ] Different image formats for different screen sizes

---

## 7. Text Overflow / Long Content

### Problem

Long text breaks layout, overflows container, or is truncated without indication.

### Solution

- Use `text-overflow: ellipsis` for single line
- Use line clamping for multiple lines
- Prevent layout break
- Consider responsive font size
- Show tooltip for truncated content

### Code Example

```css
/* ✅ Correct: Single line text truncation */
.truncate-single {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* ✅ Correct: Multi-line text truncation (line clamp) */
.truncate-multi {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* ✅ Correct: Prevent layout break */
.description {
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* ❌ Incorrect: No truncation, layout breaks -->
.bad-text {
  max-width: 200px;
  /* Text overflows without any truncation */
}

/* ❌ Incorrect: Text hidden without indication -->
.bad-text {
  overflow: hidden;
  /* Text is hidden but user doesn't know it's truncated */
}
```

```jsx
// ✅ Correct: Text truncation with tooltip
const TruncatedText = ({ text, maxLength = 50 }) => {
  const isTruncated = text.length > maxLength;
  const displayText = isTruncated ? text.slice(0, maxLength) + '...' : text;

  return (
    <span title={isTruncated ? text : ''} className="truncate">
      {displayText}
    </span>
  );
};
```

### Checklist

- [ ] Long text properly truncated
- [ ] Ellipsis shown for truncated text
- [ ] Layout doesn't break with long content
- [ ] Tooltip shows full text on hover (if truncated)
- [ ] Mobile responsive
- [ ] Line height appropriate

---

## 8. Spacing Consistency

### Problem

Uneven padding/margin, inconsistent component spacing, irregular gaps.

### Solution

- Maintain consistent padding/margin using spacing scale
- Use 4px, 8px, 16px, 24px, 32px grid
- Avoid random spacing values
- Document spacing system
- Use CSS variables for consistency

### Code Example

```css
/* ✅ Correct: Spacing system with CSS variables */
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
}

/* Apply consistent spacing */
.card {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  border-radius: 8px;
}

.button {
  padding: var(--spacing-sm) var(--spacing-md);
  margin: var(--spacing-sm);
}

.input {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.heading {
  margin-bottom: var(--spacing-md);
  font-size: 24px;
}

.paragraph {
  margin-bottom: var(--spacing-md);
  line-height: 1.6;
}

/* ❌ Incorrect: Random spacing values */
.bad-card {
  padding: 12px; /* Not in scale */
  margin-bottom: 19px; /* Random value */
  border-radius: 8px;
}

.bad-button {
  padding: 10px 18px; /* Random values */
  margin: 5px; /* Random value */
}
```

```jsx
// ✅ Correct: Spacing system with Tailwind or CSS-in-JS
const Card = () => (
  <div className="p-4 mb-6"> {/* p-4 = 16px, mb-6 = 24px */}
    <h3 className="text-lg mb-2">Title</h3>
    <p className="text-base text-gray-600">Content</p>
  </div>
);
```

### Checklist

- [ ] Spacing follows consistent scale
- [ ] CSS variables used for spacing
- [ ] No random spacing values
- [ ] Padding consistent within component types
- [ ] Margin consistent between components
- [ ] Vertical rhythm maintained
- [ ] Responsive spacing adjusts appropriately

---

## 9. Scroll Behavior Issues

### Problem

Background scrolls when modal is open. Inner scroll not working. Page jumps on scroll.

### Solution

- Prevent background scroll when modal is open
- Handle inner scroll (modals, dropdowns, lists)
- Use smooth scrolling where appropriate
- Prevent scroll position jump

### Code Example

```javascript
// ✅ Correct: Prevent background scroll
const openModal = () => {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = scrollbarWidth + 'px'; // Prevent layout shift
};

const closeModal = () => {
  document.body.style.overflow = 'auto';
  document.body.style.paddingRight = '0px';
};
```

```css
/* ✅ Correct: Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* ✅ Correct: Inner scroll in modal */
.modal {
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.modal::-webkit-scrollbar {
  width: 8px;
}

.modal::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.modal::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

/* ❌ Incorrect: No scroll prevention */
body.modal-open {
  /* Missing overflow: hidden; */
}

/* ❌ Incorrect: Scroll position jumps */
body {
  overflow: hidden; /* Creates layout shift from scrollbar disappearing */
}
```

```jsx
// ✅ Correct: Handle scroll in React
useEffect(() => {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  
  if (isModalOpen) {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = scrollbarWidth + 'px';
  }
  
  return () => {
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '0px';
  };
}, [isModalOpen]);
```

### Checklist

- [ ] Background scroll prevented when modal open
- [ ] No layout shift when scrollbar disappears
- [ ] Inner scroll works for long content
- [ ] Smooth scrolling implemented
- [ ] Scroll position preserved after modal close
- [ ] Mobile scroll behavior correct

---

## 10. Z-Index Issues

### Problem

Elements appear in wrong stacking order. Dropdowns behind modals. Tooltips hidden behind other elements.

### Solution

- Establish proper stacking order
- Use meaningful z-index values (100, 200, 300, etc.)
- Avoid random/conflicting z-index values
- Document z-index hierarchy

### Code Example

```css
/* ✅ Correct: Z-index hierarchy */
:root {
  --z-dropdown: 100;
  --z-tooltip: 110;
  --z-modal: 200;
  --z-modal-overlay: 190;
  --z-notification: 250;
}

.modal-overlay {
  z-index: var(--z-modal-overlay);
}

.modal {
  z-index: var(--z-modal);
}

.dropdown {
  z-index: var(--z-dropdown);
}

.tooltip {
  z-index: var(--z-tooltip);
}

.notification {
  z-index: var(--z-notification);
}

/* ✅ Correct: Position context */
.card {
  position: relative;
  z-index: auto; /* Reset stacking context */
}

.card .dropdown {
  position: absolute;
  z-index: 1; /* Relative to parent context */
}

/* ❌ Incorrect: Random z-index values */
.bad-modal {
  z-index: 9999; /* Too high */
}

.bad-dropdown {
  z-index: 10; /* Conflicts with other elements */
}

/* ❌ Incorrect: No stacking context management */
.bad-overlay {
  z-index: 100;
}

.bad-modal {
  z-index: 101;
}

.bad-tooltip {
  z-index: 102;
}
/* Hard to maintain */
```

### Z-Index Hierarchy Reference

```
Priority Level    Z-Index    Purpose
─────────────────────────────────────
Base Elements     0-10       Default content
Interactive       20-50      Buttons, inputs
Popover/Tooltip   100-110    Popovers, tooltips
Dropdown          100        Dropdown menus
Sticky            110        Sticky headers
Modal Overlay     190        Modal background
Modal             200        Modal window
Notification      250        Toast messages
Debug             9000+      Dev tools
```

### Checklist

- [ ] Z-index values organized in hierarchy
- [ ] Dropdowns above content
- [ ] Modal overlay below modal
- [ ] Modal above other content
- [ ] Notifications above modals
- [ ] Tooltips visible above other elements
- [ ] No conflicting z-index values
- [ ] Stacking context managed properly

---

## 11. Form Edge Cases

### Problem

Error messages unclear, invalid fields not highlighted, spacing inconsistent between form states.

### Solution

- Show error messages clearly and near field
- Highlight invalid fields visually
- Maintain consistent spacing in all states
- Handle all states: empty, loading, success, error

### Code Example

```jsx
// ✅ Correct: Form with complete state handling
const Form = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await submitForm(formData);
      setSubmitSuccess(true);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={errors.email ? 'input-error' : ''}
        />
        {errors.email && (
          <span id="email-error" className="error-message" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className={errors.password ? 'input-error' : ''}
        />
        {errors.password && (
          <span id="password-error" className="error-message" role="alert">
            {errors.password}
          </span>
        )}
      </div>

      {errors.submit && (
        <div className="error-alert" role="alert">
          {errors.submit}
        </div>
      )}

      {submitSuccess && (
        <div className="success-alert" role="status">
          Form submitted successfully!
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};
```

```css
/* ✅ Correct: Form styling for all states */
.form-group {
  margin-bottom: 20px; /* Consistent spacing */
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

input.input-error {
  border-color: #dc3545;
  background-color: #fff5f5;
}

input.input-error:focus {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin-top: 4px;
  display: block;
}

.error-alert {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.success-alert {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

/* ❌ Incorrect: Error not highlighted */
.bad-input {
  border: 1px solid #ddd;
  /* No change when error occurs */
}

/* ❌ Incorrect: Error message far from input */
.bad-error-message {
  margin-top: 50px; /* Too far from input */
}
```

### Checklist

- [ ] All input fields have labels
- [ ] Error messages appear near field
- [ ] Invalid fields highlighted (color + border)
- [ ] Error text is clear and actionable
- [ ] Success state shown after submission
- [ ] Loading state shown while submitting
- [ ] Empty state handled
- [ ] Form spacing consistent in all states
- [ ] Error messages screen reader accessible

---

## 12. Animation & Transition Issues

### Problem

Abrupt UI changes, no feedback on interaction, excessive animations slow down interface.

### Solution

- Add smooth transitions (200-300ms)
- Avoid abrupt UI changes
- Don't overuse animations
- Use `transform` and `opacity` for performance
- Respect `prefers-reduced-motion`

### Code Example

```css
/* ✅ Correct: Smooth transitions */
button {
  transition: all 0.2s ease; /* Default: 200ms */
}

button:hover {
  background: #0056b3;
  transform: translateY(-2px); /* Lift effect */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* ✅ Correct: Performance-optimized animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.modal-enter {
  animation: slideIn 0.3s ease;
}

/* ✅ Correct: Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ❌ Incorrect: Too slow */
.bad-transition {
  transition: all 2s ease; /* Too slow */
}

/* ❌ Incorrect: Janky animation */
.bad-animation {
  animation: slide 1s ease;
  /* Using expensive properties like left, top */
}

/* ❌ Incorrect: No reduced motion support */
.animation {
  animation: spin 1s linear infinite;
  /* Doesn't respect prefers-reduced-motion */
}
```

```jsx
// ✅ Correct: Smooth state changes
const Dropdown = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dropdown">
      <button onClick={() => setIsOpen(!isOpen)}>
        Menu
      </button>
      
      {isOpen && (
        <ul className="dropdown-menu">
          <li><a href="#1">Option 1</a></li>
          <li><a href="#2">Option 2</a></li>
        </ul>
      )}
    </div>
  );
};
```

```css
.dropdown-menu {
  animation: slideDown 0.2s ease;
  transform-origin: top;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Checklist

- [ ] Transitions smooth (200-300ms)
- [ ] No abrupt state changes
- [ ] Animations use `transform` and `opacity`
- [ ] Animations don't slow interaction
- [ ] `prefers-reduced-motion` respected
- [ ] Hover effects animate smoothly
- [ ] Focus changes show transition
- [ ] Performance impact minimal

---

## 13. Responsive Edge Cases

### Problem

Layout breaks on small screens. Text too small. Touch targets too small. Content overflows.

### Solution

- Test on small mobile screens (320px)
- Test on tablet (768px)
- Test on desktop (1920px+)
- Avoid horizontal scrolling
- Use mobile-first approach
- Test with actual devices

### Code Example

```css
/* ✅ Correct: Mobile-first responsive design */

/* Mobile first (320px) */
.container {
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.card {
  width: 100%;
  margin-bottom: 16px;
}

button {
  width: 100%;
  padding: 16px; /* Touch target >= 44px */
}

/* Tablet (768px) */
@media (min-width: 768px) {
  .container {
    padding: 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  
  button {
    width: auto;
  }
}

/* Desktop (1024px) */
@media (min-width: 1024px) {
  .container {
    grid-template-columns: 1fr 1fr 1fr;
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* ❌ Incorrect: Desktop-first, mobile breaks -->
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
  }
}
```

```html
<!-- ✅ Correct: Responsive images -->
<picture>
  <source media="(max-width: 600px)" srcset="image-mobile.jpg" />
  <source media="(max-width: 1200px)" srcset="image-tablet.jpg" />
  <img src="image-desktop.jpg" alt="Description" />
</picture>

<!-- ✅ Correct: Viewport meta tag -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### Checklist

- [ ] Layout works at 320px (mobile)
- [ ] Layout works at 768px (tablet)
- [ ] Layout works at 1024px+ (desktop)
- [ ] No horizontal scrolling
- [ ] Touch targets >= 44px
- [ ] Text readable without zoom
- [ ] Images responsive
- [ ] Mobile-first approach used

---

## 14. Icon Alignment Issues

### Problem

Icons misaligned with text. Inconsistent icon sizing. Icon spacing irregular.

### Solution

- Align icons with text baseline or center
- Maintain consistent icon size (usually 16px, 20px, 24px)
- Use proper spacing between icon and text
- Ensure icon clarity at different sizes

### Code Example

```css
/* ✅ Correct: Icon-text alignment */
.icon-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* ✅ Correct: Inline icon alignment */
.inline-icon {
  display: inline-block;
  vertical-align: middle;
  width: 16px;
  height: 16px;
  margin: 0 4px;
}

/* ✅ Correct: Button icon */
.button-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.button-with-icon .icon {
  width: 20px;
  height: 20px;
}

/* ❌ Incorrect: Misaligned icon -->
.bad-icon-text {
  icon: some icon;
  text: "Label";
  /* Not properly aligned */
}

/* ❌ Incorrect: Inconsistent icon size -->
.bad-icon {
  width: 18px;
  height: 22px; /* Different from width */
}
```

```jsx
// ✅ Correct: Icon component
const IconButton = ({ icon: Icon, label }) => (
  <button className="button-with-icon">
    <Icon className="icon" aria-hidden="true" />
    <span>{label}</span>
  </button>
);

// ✅ Correct: Icon text combination
const IconLabel = ({ icon: Icon, text }) => (
  <span className="icon-text">
    <Icon className="icon" aria-hidden="true" />
    {text}
  </span>
);
```

### Checklist

- [ ] Icons aligned with text
- [ ] Consistent icon sizes (16px, 20px, 24px)
- [ ] Proper spacing between icon and text
- [ ] Icons clear and visible
- [ ] Icon colors match context
- [ ] Icons have `aria-hidden="true"` (decorative)
- [ ] Icon spacing consistent across app

---

## 15. Click Area / Touch Targets

### Problem

Buttons too small to click. Links difficult to tap on mobile. Insufficient padding in clickable areas.

### Solution

- Minimum touch target: **44px × 44px** (WCAG guideline)
- Adequate spacing between targets (8px minimum)
- Ensure clickable area matches visual area
- Use padding to increase touch target

### Code Example

```css
/* ✅ Correct: Adequate touch targets */
button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 16px;
}

a {
  display: inline-block;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
}

.icon-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ✅ Correct: Spacing between targets -->
.button-group {
  display: flex;
  gap: 8px; /* At least 8px between buttons */
}

/* ❌ Incorrect: Touch target too small -->
.bad-button {
  padding: 4px 8px;
  font-size: 12px;
}

/* ❌ Incorrect: No spacing between targets -->
.bad-button-group {
  display: flex;
  gap: 0; /* Buttons touching */
}
```

### Touch Target Guidelines

```
Minimum: 44px × 44px
Recommended: 48px × 48px
Spacing: 8px minimum
Density: Max 3 buttons per row on mobile
```

### Checklist

- [ ] All buttons >= 44px × 44px
- [ ] All links >= 44px × 44px
- [ ] 8px minimum spacing between targets
- [ ] Touch target matches visual area
- [ ] No overlap between targets
- [ ] Adequate padding inside elements
- [ ] Mobile-friendly click areas

---

## 16. Empty / No Data States

### Problem

No indication when there's no data. Blank screens confuse users. No guidance on what to do next.

### Solution

- Always design empty/no-data state
- Show meaningful message or illustration
- Provide action or next step
- Distinguish from error state

### Code Example

```jsx
// ✅ Correct: Handle all data states
const DataList = ({ data, isLoading, error }) => {
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};

const EmptyState = () => (
  <div className="empty-state">
    <EmptyIcon />
    <h2>No items yet</h2>
    <p>Get started by creating your first item</p>
    <button onClick={createItem}>Create Item</button>
  </div>
);

const ErrorState = ({ error }) => (
  <div className="error-state">
    <ErrorIcon />
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
    <button onClick={retry}>Try Again</button>
  </div>
);

const LoadingState = () => (
  <div className="loading-state">
    <Skeleton count={3} />
  </div>
);
```

```css
/* ✅ Correct: Empty state styling */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  min-height: 400px;
  background: #f9f9f9;
  border: 1px dashed #ddd;
  border-radius: 8px;
}

.empty-state svg {
  width: 80px;
  height: 80px;
  color: #ccc;
  margin-bottom: 20px;
}

.empty-state h2 {
  font-size: 20px;
  color: #333;
  margin-bottom: 8px;
}

.empty-state p {
  color: #999;
  margin-bottom: 20px;
}

/* Error state */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background: #fff5f5;
  border: 1px solid #ffebee;
  border-radius: 8px;
}

.error-state h2 {
  color: #c33;
  margin-bottom: 8px;
}
```

### Checklist

- [ ] Empty state designed and shown
- [ ] No data state handled
- [ ] Error state distinct from empty
- [ ] Clear message on empty state
- [ ] Action provided (e.g., create button)
- [ ] Loading state shown
- [ ] Appropriate imagery/icon
- [ ] Helpful guidance text

---

## 17. Skeleton / Loading UI

### Problem

Blank screens while loading. No indication of progress. Poor perceived performance.

### Solution

- Show skeleton loaders for content
- Match actual content layout
- Avoid blank screens
- Provide feedback during wait time

### Code Example

```jsx
// ✅ Correct: Skeleton loader component
const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-image"></div>
    <div className="skeleton skeleton-text"></div>
    <div className="skeleton skeleton-text skeleton-short"></div>
  </div>
);

const CardList = ({ isLoading, items }) => {
  if (isLoading) {
    return (
      <div className="card-grid">
        {Array(6).fill(null).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="card-grid">
      {items.map((item) => (
        <Card key={item.id} item={item} />
      ))}
    </div>
  );
};
```

```css
/* ✅ Correct: Skeleton animation */
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-card {
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #eee;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.skeleton-text {
  height: 16px;
  margin-bottom: 8px;
  border-radius: 4px;
}

.skeleton-short {
  width: 60%;
}

/* ❌ Incorrect: Blank screen while loading -->
.loading {
  display: none; /* Just hides everything */
}
```

### Checklist

- [ ] Skeleton loader matches content layout
- [ ] Loading animation smooth and continuous
- [ ] Multiple skeletons for list items
- [ ] Progress indication visible
- [ ] Skeleton removes when content loads
- [ ] No blank screens during load

---

## 18. Cursor & Interaction Feedback

### Problem

No cursor feedback. Can't tell what's clickable. No visual feedback on interaction.

### Solution

- Pointer cursor for clickable elements
- Change cursor on hover
- Visual feedback on click/press
- Clear indication of active state

### Code Example

```css
/* ✅ Correct: Cursor feedback */
button {
  cursor: pointer;
}

a {
  cursor: pointer;
}

.clickable {
  cursor: pointer;
}

input {
  cursor: text;
}

textarea {
  cursor: text;
}

select {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

.draggable {
  cursor: grab;
}

.draggable:active {
  cursor: grabbing;
}

/* ❌ Incorrect: Wrong cursor -->
button {
  cursor: default; /* Should be pointer */
}

a {
  cursor: auto; /* Should be pointer */
}

/* ❌ Incorrect: No feedback -->
.clickable {
  /* No cursor change */
}
```

### Checklist

- [ ] Clickable elements have pointer cursor
- [ ] Disabled elements have not-allowed cursor
- [ ] Cursor changes on hover
- [ ] Visual feedback on click
- [ ] Clear active/pressed state
- [ ] No confusion about clickability

---

## 19. Shadow & Depth Issues

### Problem

Inconsistent shadows. Floating elements unclear. Shadow too strong or too weak.

### Solution

- Consistent box-shadow usage
- Shadow increases with elevation
- Use shadows sparingly
- Consider color/contrast for visibility

### Code Example

```css
/* ✅ Correct: Shadow hierarchy */

/* Level 1: Subtle shadow for cards */
.card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Level 2: Medium shadow for elevated content */
.modal {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

/* Level 3: Strong shadow for highest elements */
.dropdown {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
}

/* Level 4: Strong shadow for tooltips/popovers */
.tooltip {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* ❌ Incorrect: Inconsistent shadows -->
.card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.button {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.modal {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}
/* Mixed styles and values */

/* ❌ Incorrect: Shadow too strong -->
.element {
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); /* Too dark */
}
```

### Shadow Hierarchy Reference

```
Level 0 (Base):      0 1px 3px rgba(0, 0, 0, 0.1)      - Cards, panels
Level 1 (Hover):     0 4px 6px rgba(0, 0, 0, 0.1)      - Hover state
Level 2 (Elevated):  0 10px 25px rgba(0, 0, 0, 0.2)    - Floating cards
Level 3 (Modal):     0 20px 25px rgba(0, 0, 0, 0.15)   - Dropdowns, modals
Level 4 (Top):       0 25px 50px rgba(0, 0, 0, 0.25)   - Tooltips, popovers
```

### Checklist

- [ ] Shadows consistent across components
- [ ] Shadows increase with elevation
- [ ] Shadow color matches theme
- [ ] No excessive shadows
- [ ] Shadows subtle on light backgrounds
- [ ] Shadows visible on dark backgrounds

---

## 20. Font Rendering Issues

### Problem

Fonts render inconsistently across devices. Text scaling unexpected. Font weight incorrect.

### Solution

- Use system fonts or web fonts consistently
- Maintain font-size hierarchy
- Test on actual devices
- Use font-weight appropriately
- Handle font loading

### Code Example

```css
/* ✅ Correct: Font stack */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ✅ Correct: Font sizes and weights -->
h1 {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
}

h2 {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.3;
}

h3 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.4;
}

body {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
}

small {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
}

/* ✅ Correct: Web font loading -->
@font-face {
  font-family: 'CustomFont';
  src: url('custom-font.woff2') format('woff2');
  font-display: swap; /* Show fallback while loading */
}

/* ❌ Incorrect: Inconsistent font stack -->
body {
  font-family: Arial; /* Too specific, poor fallbacks */
}

/* ❌ Incorrect: Font scales unexpectedly -->
body {
  font-size: 100%; /* Can be affected by browser zoom */
}
```

### Checklist

- [ ] Font family stack includes fallbacks
- [ ] Font sizes follow hierarchy
- [ ] Font weights appropriate
- [ ] Line height adequate (1.4-1.6 for body)
- [ ] Web fonts loaded properly
- [ ] Text renders consistently across devices
- [ ] Mobile font sizes readable

---

## 21. Input Field UX Issues

### Problem

Placeholder replaces label. Focus state not visible. Padding too small. Error message unclear.

### Solution

- Placeholder doesn't replace label
- Focus state must be visible
- Adequate padding inside inputs
- Clear error messages
- Consistent input styling

### Code Example

```html
<!-- ✅ Correct: Input with label and placeholder -->
<div class="form-group">
  <label for="email">Email Address</label>
  <input
    id="email"
    type="email"
    placeholder="john@example.com"
    aria-describedby="email-hint email-error"
    aria-invalid="false"
  />
  <small id="email-hint">We'll never share your email</small>
  <span id="email-error" role="alert"></span>
</div>

<!-- ❌ Incorrect: Placeholder replaces label -->
<input type="email" placeholder="Email Address" />
<!-- User can't see what field is for once they start typing -->
```

```css
/* ✅ Correct: Input styling */
input,
textarea,
select {
  padding: 12px 14px; /* Adequate padding */
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1.5;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

input:invalid {
  border-color: #dc3545;
}

input:invalid:focus {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

input::placeholder {
  color: #999;
  opacity: 1;
}

input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

/* ❌ Incorrect: No focus state -->
input {
  border: 1px solid #ddd;
  /* No focus style */
}

/* ❌ Incorrect: Padding too small -->
input {
  padding: 4px 6px;
}
```

### Checklist

- [ ] Every input has a label
- [ ] Placeholder is not label replacement
- [ ] Focus state clearly visible
- [ ] Adequate padding (12px+ vertical)
- [ ] Error messages near input
- [ ] Disabled state clear
- [ ] Consistent styling across inputs
- [ ] Touch-friendly size (44px+ height)

---

## 22. Alignment Issues

### Problem

Elements "almost aligned" but not quite. Vertical and horizontal misalignment. Common AI mistake.

### Solution

- Use flexbox for precise alignment
- Use grid for consistent layout
- Check alignment with design tools
- Use CSS alignment properties consistently
- Avoid manual positioning with `top`, `left`

### Code Example

```css
/* ✅ Correct: Flexbox alignment -->
.header {
  display: flex;
  align-items: center; /* Vertical center */
  justify-content: space-between; /* Horizontal distribution */
  height: 60px;
  padding: 0 20px;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: stretch; /* Full width children */
}

.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ✅ Correct: Grid alignment -->
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start; /* Align to top */
}

/* ✅ Correct: Text alignment -->
.center-text {
  text-align: center;
}

.right-text {
  text-align: right;
}

/* ❌ Incorrect: Manual positioning -->
.bad-alignment {
  position: absolute;
  top: 50px; /* Manual, inexact */
  left: 100px;
}

/* ❌ Incorrect: Margin hacks for alignment -->
.bad-button {
  margin-top: 12px; /* Fragile, not scalable */
  margin-left: 8px;
}

/* ❌ Incorrect: Almost aligned -->
.bad-item {
  padding-top: 9px; /* Should be 8px or 16px */
  margin-left: 7px; /* Random value */
}
```

### Alignment Checklist

- [ ] Use flexbox for 1D layouts
- [ ] Use grid for 2D layouts
- [ ] Use `align-items` for vertical centering
- [ ] Use `justify-content` for horizontal distribution
- [ ] No manual positioning (no `top`, `left`)
- [ ] Consistent spacing (4px, 8px, 16px grid)
- [ ] Check alignment visually
- [ ] Responsive alignment tested

### Checklist

- [ ] Vertical alignment precise
- [ ] Horizontal alignment precise
- [ ] No "almost aligned" elements
- [ ] Consistent alignment system
- [ ] Flexbox used appropriately
- [ ] Grid used appropriately
- [ ] Alignment works on all screen sizes

---

## 23. Component Reusability Issues

### Problem

Hardcoded values in components. Similar components with different styles. Inconsistent reuse.

### Solution

- Avoid hardcoded values
- Use props for customization
- Create reusable component library
- Document component variations
- Maintain consistency

### Code Example

```jsx
// ✅ Correct: Reusable, customizable component
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  ...props
}) => {
  return (
    <button
      className={`button button--${variant} button--${size}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Usage
<Button variant="primary">Submit</Button>
<Button variant="secondary" size="lg">Cancel</Button>
<Button variant="danger" disabled>Delete</Button>

// ❌ Incorrect: Hardcoded values
const SubmitButton = () => (
  <button
    style={{
      background: '#007bff',
      padding: '12px 24px',
      fontSize: '16px'
    }}
  >
    Submit
  </button>
);

const CancelButton = () => (
  <button
    style={{
      background: '#ddd',
      padding: '12px 24px',
      fontSize: '16px'
    }}
  >
    Cancel
  </button>
);
// Duplicate code, hard to maintain
```

```css
/* ✅ Correct: Reusable component styles */
.button {
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.button--primary {
  background: #007bff;
  color: white;
}

.button--primary:hover {
  background: #0056b3;
}

.button--secondary {
  background: #ddd;
  color: #333;
}

.button--secondary:hover {
  background: #ccc;
}

.button--sm {
  padding: 8px 12px;
  font-size: 14px;
}

.button--md {
  padding: 12px 24px;
  font-size: 16px;
}

.button--lg {
  padding: 16px 32px;
  font-size: 18px;
}
```

### Checklist

- [ ] Components accept props
- [ ] No hardcoded values
- [ ] Reusable across the app
- [ ] Consistent styling
- [ ] Component library documented
- [ ] Variants defined clearly
- [ ] Easy to extend/modify

---

## 24. API Error Handling UI

### Problem

User gets no feedback when API fails. Error message unclear or missing. No retry option.

### Solution

- Show error message on failure
- Don't leave user without feedback
- Provide clear, actionable error text
- Offer retry option
- Log errors for debugging

### Code Example

```jsx
// ✅ Correct: API error handling UI
const DataFetch = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/data');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError({
        message: 'Failed to load data',
        details: err.message,
        retry: true
      });
      
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="error-container" role="alert">
        <ErrorIcon />
        <h2>{error.message}</h2>
        <p>{error.details}</p>
        <button onClick={fetchData}>Try Again</button>
      </div>
    );
  }

  return <DataDisplay data={data} />;
};
```

```css
/* ✅ Correct: Error UI styling */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background: #fff5f5;
  border: 2px solid #ffcdd2;
  border-radius: 8px;
  text-align: center;
}

.error-container svg {
  width: 60px;
  height: 60px;
  color: #d32f2f;
  margin-bottom: 16px;
}

.error-container h2 {
  font-size: 18px;
  color: #c62828;
  margin-bottom: 8px;
}

.error-container p {
  font-size: 14px;
  color: #d32f2f;
  margin-bottom: 20px;
}

.error-container button {
  background: #d32f2f;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-container button:hover {
  background: #c62828;
}
```

### Checklist

- [ ] Error message shown to user
- [ ] Error text clear and actionable
- [ ] Retry button provided
- [ ] Different error types handled
- [ ] Error logged for debugging
- [ ] User not left confused
- [ ] Error state styled distinctly

---

## 25. State Handling Issues

### Problem

Component doesn't handle all states. Transitions between states unclear. Missing states cause crashes.

### Solution

- Handle all states: idle, loading, success, error
- Make state transitions clear
- Show appropriate UI for each state
- Prevent state confusion

### Code Example

```jsx
// ✅ Correct: Complete state handling
const STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

const Form = () => {
  const [state, setState] = useState(STATES.IDLE);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setState(STATES.LOADING);
    
    try {
      const result = await submitForm(formData);
      setData(result);
      setState(STATES.SUCCESS);
      
      // Auto-dismiss success after 3 seconds
      setTimeout(() => {
        setState(STATES.IDLE);
      }, 3000);
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  return (
    <div>
      {state === STATES.IDLE && (
        <FormInput onSubmit={handleSubmit} />
      )}
      
      {state === STATES.LOADING && (
        <LoadingSpinner />
      )}
      
      {state === STATES.SUCCESS && (
        <SuccessMessage data={data} />
      )}
      
      {state === STATES.ERROR && (
        <ErrorMessage error={error} onRetry={() => setState(STATES.IDLE)} />
      )}
    </div>
  );
};

// ❌ Incorrect: Missing state handling
const BadForm = () => {
  const [formData, setFormData] = useState(null);

  const handleSubmit = async (data) => {
    const result = await submitForm(data);
    setFormData(result);
    // What if it fails? No error handling!
  };

  return <FormInput onSubmit={handleSubmit} data={formData} />;
};
```

### State Machine Pattern

```
States and Transitions:
─────────────────────
IDLE ──→ LOADING ──→ SUCCESS ──→ IDLE
  ↓
  └──→ LOADING ──→ ERROR ──→ IDLE

Allowed transitions:
- IDLE → LOADING (on submit)
- LOADING → SUCCESS (on success)
- LOADING → ERROR (on failure)
- SUCCESS → IDLE (after delay)
- ERROR → IDLE (on retry)
```

### Checklist

- [ ] Idle state defined
- [ ] Loading state shown
- [ ] Success state shown
- [ ] Error state shown
- [ ] State transitions clear
- [ ] No undefined states
- [ ] All states have UI
- [ ] State transitions logged

---

## 26. Accessibility Misses (Common)

### Problem

Missing alt text on images. Inputs without labels. No focus styles. Common accessibility oversights.

### Solution

- Always add `alt` text to images
- Always add labels to inputs
- Always add visible focus states
- Use semantic HTML
- Test with screen readers

### Code Example

```html
<!-- ✅ Correct: Accessibility attributes -->
<img 
  src="photo.jpg" 
  alt="Team of developers working at desks" 
/>

<label for="email">Email Address</label>
<input 
  id="email" 
  type="email"
  aria-describedby="email-hint"
/>
<small id="email-hint">Required field</small>

<button aria-label="Close menu">✕</button>

<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="#home">Home</a></li>
    <li><a href="#about">About</a></li>
  </ul>
</nav>

<!-- ❌ Incorrect: Missing accessibility -->
<img src="photo.jpg" /> <!-- No alt text -->

<input type="email" placeholder="Email" /> <!-- No label -->

<button>✕</button> <!-- No aria-label for icon button -->

<a href="#menu">Menu</a> <!-- Not a button for navigation -->
```

### Accessibility Checklist

- [ ] All images have `alt` text
- [ ] All inputs have labels
- [ ] Focus states visible
- [ ] Semantic HTML used
- [ ] ARIA attributes where needed
- [ ] Keyboard navigation works
- [ ] Color contrast adequate
- [ ] Screen reader tested

---

## 27. Performance UI Issues

### Problem

Layout shift during loading. Images cause reflow. Janky animations. Poor perceived performance.

### Solution

- Avoid layout shift (Cumulative Layout Shift / CLS)
- Optimize images
- Lazy load below-the-fold content
- Use `will-change` sparingly

### Code Example

```css
/* ✅ Correct: Prevent layout shift -->
.image-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #f0f0f0;
  overflow: hidden;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ✅ Correct: Reserve space for dynamic content */
.button-container {
  min-height: 44px; /* Reserve space */
}

.skeleton {
  width: 100%;
  height: 200px; /* Match final height */
}

/* ✅ Correct: Lazy loading */
<img 
  src="image.jpg" 
  loading="lazy"
  alt="Description"
/>

/* ❌ Incorrect: Causes layout shift -->
.image {
  /* No fixed dimensions */
}

/* ❌ Incorrect: Image loads and causes reflow -->
<img src="image.jpg" />
<!-- If height not specified, layout shifts */
```

### Checklist

- [ ] No layout shift (CLS = 0)
- [ ] Images have fixed dimensions
- [ ] Skeleton loaders match content
- [ ] Lazy loading implemented
- [ ] Fonts don't cause shift
- [ ] Dynamic content space reserved
- [ ] Performance metrics monitored

---

## 28. Copy-Paste Design Inconsistency

### Problem

Reused components with slight style variations. Border radius 6px here, 8px there. Spacing inconsistent.

### Solution

- Ensure reused components follow same styles
- Avoid slight variations
- Use component system consistently
- Test consistency across app

### Code Example

```jsx
// ✅ Correct: Consistent reused component
const Card = ({ title, content, variant = 'default' }) => (
  <div className={`card card--${variant}`}>
    <h3 className="card-title">{title}</h3>
    <p className="card-content">{content}</p>
  </div>
);

// Usage - all consistent
<Card title="Item 1" content="Description 1" />
<Card title="Item 2" content="Description 2" variant="highlighted" />

// ❌ Incorrect: Inconsistent copy-paste
const CardV1 = ({ title, content }) => (
  <div style={{ borderRadius: '6px', padding: '12px' }}>
    <h3>{title}</h3>
    <p>{content}</p>
  </div>
);

const CardV2 = ({ title, content }) => (
  <div style={{ borderRadius: '8px', padding: '16px' }}>
    <h3>{title}</h3>
    <p>{content}</p>
  </div>
);
// Different styles for same component!
```

### Checklist

- [ ] Reused components identical
- [ ] Same styles across instances
- [ ] No copy-paste variations
- [ ] Component system documented
- [ ] Variants defined clearly
- [ ] Consistency verified

---

## 29. Edge Case: Multiple Actions

### Problem

User can submit form multiple times. Double-click creates duplicate entries. No prevention of multiple API calls.

### Solution

- Prevent double submit
- Disable UI during processing
- Use debouncing or throttling
- Show clear loading state

### Code Example

```jsx
// ✅ Correct: Prevent multiple submissions
const Form = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent multiple submissions
    
    setIsSubmitting(true);
    
    try {
      await submitForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" required />
      <button disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};

// ✅ Correct: Debounce search
const SearchInput = () => {
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const timeoutRef = useRef(null);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Debounce search
    timeoutRef.current = setTimeout(async () => {
      const data = await search(newValue);
      setResults(data);
    }, 300);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder="Search..."
    />
  );
};

// ❌ Incorrect: Multiple submissions allowed
const BadForm = () => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitForm(); // Can be called multiple times
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" required />
      <button>Submit</button> {/* Not disabled during submit */}
    </form>
  );
};
```

### Checklist

- [ ] Multiple submissions prevented
- [ ] Button disabled during submission
- [ ] Loading state shown
- [ ] API calls debounced (search, etc.)
- [ ] Clear visual feedback
- [ ] No duplicate entries created

---

## 30. Final Rule (Important)

### Every UI Component Must Support All States

```
State Checklist:

☐ Default state
  └─ Normal appearance
  └─ Ready for interaction

☐ Hover state
  └─ Visual feedback on mouse over
  └─ Only for desktop

☐ Focus state
  └─ Visible outline for keyboard users
  └─ Critical for accessibility

☐ Active state
  └─ Pressed/clicked appearance
  └─ Temporary feedback

☐ Disabled state
  └─ Visually distinct
  └─ Not clickable
  └─ Cursor: not-allowed

☐ Loading state
  └─ Shows progress
  └─ Button disabled
  └─ Clear feedback

☐ Error state
  └─ Red/warning color
  └─ Error message shown
  └─ Clear indication of problem
```

### Implementation Example

```jsx
// ✅ Correct: Component with all states
const Button = ({ isLoading, isDisabled, hasError, onClick }) => {
  const getStateClass = () => {
    if (isLoading) return 'button--loading';
    if (isDisabled) return 'button--disabled';
    if (hasError) return 'button--error';
    return '';
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading || isDisabled}
      className={`button ${getStateClass()}`}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
    >
      {isLoading ? <Spinner /> : 'Submit'}
    </button>
  );
};
```

```css
/* ✅ All states styled */
.button {
  /* Default state */
  background: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.button:hover:not(:disabled) {
  /* Hover state */
  background: #0056b3;
  box-shadow: 0 4px 12px rgba(0, 86, 179, 0.3);
}

.button:focus-visible {
  /* Focus state */
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

.button:active:not(:disabled) {
  /* Active state */
  background: #004085;
  transform: scale(0.98);
}

.button:disabled,
.button--disabled {
  /* Disabled state */
  background: #ccc;
  color: #666;
  cursor: not-allowed;
  opacity: 0.6;
}

.button--loading {
  /* Loading state */
  background: #0056b3;
  cursor: wait;
}

.button--error {
  /* Error state */
  background: #dc3545;
}

.button--error:hover {
  background: #c82333;
}
```

---

## Master Checklist: Before Deployment

### Critical (Must Have)

- [ ] All interactive elements have hover/focus/active states
- [ ] All images have alt text
- [ ] All inputs have labels
- [ ] Modal has overlay with scroll prevention
- [ ] Buttons disabled during loading/submission
- [ ] Error messages shown clearly
- [ ] Empty states designed
- [ ] No hardcoded values
- [ ] Touch targets >= 44px
- [ ] No layout shifts (CLS = 0)

### Important (Should Have)

- [ ] Skeleton loaders for async content
- [ ] Smooth transitions (200-300ms)
- [ ] Consistent spacing system
- [ ] Z-index hierarchy established
- [ ] Proper cursor feedback
- [ ] Responsive design tested
- [ ] All states handled (idle, loading, success, error)
- [ ] Performance optimized
- [ ] Accessibility tested
- [ ] Icons aligned properly

### Nice to Have

- [ ] Custom scrollbar styling
- [ ] Consistent shadow hierarchy
- [ ] Loading indicators
- [ ] Helpful tooltips
- [ ] Keyboard shortcuts documented
- [ ] Success feedback animations
- [ ] Undo/Redo functionality
- [ ] Offline state handled

---

## Resources

- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Material Design](https://material.io/design/)
- [Design Systems](https://www.designsystems.com/)
- [Web Performance](https://web.dev/performance/)

---

**Document Metadata**

- **Version:** 1.0
- **Last Updated:** April 29, 2026
- **Status:** Active
- **Audience:** Frontend Developers, Designers, QA Engineers

---

**Remember:** These edge cases compound to create either excellent or poor user experience. Small details matter. Test thoroughly before deployment.
