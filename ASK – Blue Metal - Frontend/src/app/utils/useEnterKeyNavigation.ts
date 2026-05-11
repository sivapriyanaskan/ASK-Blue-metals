import { useEffect } from 'react';

/**
 * #20 \u2014 Enter-key form navigation.
 *
 * Activates Enter as "go to next field" inside the supplied container ref.
 * Pressing Enter on a focusable form control (input/select/textarea/[tabindex])
 * moves focus to the next focusable control instead of submitting the form.
 *
 * - Skips <textarea> (Enter must remain newline)
 * - Skips inputs with `data-enter-submit="true"` (e.g. final Save buttons)
 * - When the last focusable control is reached, the keypress is allowed
 *   through so a form submit / save-shortcut still works.
 */
export function useEnterKeyNavigation(
  containerRef: React.RefObject<HTMLElement>,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const node = containerRef.current;
    if (!node) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Allow textarea newlines and explicit submit overrides.
      if (target.tagName === 'TEXTAREA') return;
      if (target.getAttribute('data-enter-submit') === 'true') return;
      // Buttons should keep their default click-on-Enter behaviour.
      if (target.tagName === 'BUTTON') return;

      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

      const idx = focusables.indexOf(target);
      if (idx === -1) return;

      // If there's a next focusable control, jump to it.
      if (idx < focusables.length - 1) {
        event.preventDefault();
        focusables[idx + 1].focus();
      }
    };

    node.addEventListener('keydown', handler);
    return () => node.removeEventListener('keydown', handler);
  }, [containerRef, enabled]);
}
