'use client';

import { useEffect } from 'react';
import { execute } from '@/lib/pipeline/executor';

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || el.hasAttribute('contenteditable');
}

export default function KeyboardHandler() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Focus guard — don't fire commands when typing in inputs
      if (isInputFocused()) return;

      switch (e.key) {
        // Number keys → touchKey
        case '1': case '2': case '3':
        case '4': case '5': case '6':
          e.preventDefault();
          execute({ kind: 'touchKey', keyId: e.key }, 'keyboard');
          break;

        // Arrow keys → jog X/Y
        case 'ArrowRight':
          e.preventDefault();
          execute({ kind: 'jog', axis: 'x', delta: 0.01 }, 'keyboard');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          execute({ kind: 'jog', axis: 'x', delta: -0.01 }, 'keyboard');
          break;
        case 'ArrowUp':
          e.preventDefault();
          execute({ kind: 'jog', axis: 'y', delta: 0.01 }, 'keyboard');
          break;
        case 'ArrowDown':
          e.preventDefault();
          execute({ kind: 'jog', axis: 'y', delta: -0.01 }, 'keyboard');
          break;

        // PageUp/Down → jog Z
        case 'PageUp':
          e.preventDefault();
          execute({ kind: 'jog', axis: 'z', delta: 0.01 }, 'keyboard');
          break;
        case 'PageDown':
          e.preventDefault();
          execute({ kind: 'jog', axis: 'z', delta: -0.01 }, 'keyboard');
          break;

        // Home key → home position
        case 'Home':
          e.preventDefault();
          execute({ kind: 'home' }, 'keyboard');
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return null;  // invisible component, keyboard only
}
