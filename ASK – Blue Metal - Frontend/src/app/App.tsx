import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { AppProvider } from './context/AppContext';
import { router } from './routes';

/**
 * #20 \u2014 Global Enter-key navigation. Pressing Enter on a form control
 * (input/select) moves focus to the next focusable control inside the same
 * <form> instead of submitting. textarea keeps its newline behaviour, and
 * any control marked data-enter-submit="true" keeps the default submit.
 */
function useGlobalEnterKeyNavigation() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (tag !== 'INPUT' && tag !== 'SELECT' && target.getAttribute('contenteditable') !== 'true') {
        return;
      }
      if (target.getAttribute('data-enter-submit') === 'true') return;
      const inputType = (target as HTMLInputElement).type;
      if (inputType === 'submit' || inputType === 'button' || inputType === 'checkbox' || inputType === 'radio') return;

      const scope =
        target.closest('form') ||
        target.closest('[data-enter-nav]') ||
        document.body;

      const focusables = Array.from(
        scope.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

      const idx = focusables.indexOf(target);
      if (idx === -1 || idx >= focusables.length - 1) return;
      event.preventDefault();
      focusables[idx + 1].focus();
      const nextEl = focusables[idx + 1];
      if (nextEl instanceof HTMLInputElement && typeof nextEl.select === 'function') {
        nextEl.select();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

export default function App() {
  useGlobalEnterKeyNavigation();
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}