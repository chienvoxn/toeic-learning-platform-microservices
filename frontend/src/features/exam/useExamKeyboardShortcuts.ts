import { useEffect } from 'react';

interface UseExamKeyboardShortcutsProps {
  onSelectChoice: (choice: 'A' | 'B' | 'C' | 'D') => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleBookmark: () => void;
  enabled?: boolean;
}

export function useExamKeyboardShortcuts({
  onSelectChoice,
  onNext,
  onPrev,
  onToggleBookmark,
  enabled = true,
}: UseExamKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore held-key auto-repeat, browser/OS modifier shortcuts, or already-handled events
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) {
        return;
      }

      const target = e.target;
      if (target instanceof HTMLElement) {
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLMediaElement ||
          target.isContentEditable ||
          Boolean(target.closest('audio, video, [role="dialog"], [data-shortcut-ignore="true"]'))
        ) {
          return;
        }
      }

      const key = e.key.toUpperCase();

      if (key === 'A' || key === '1') {
        e.preventDefault();
        onSelectChoice('A');
      } else if (key === 'B' || key === '2') {
        e.preventDefault();
        onSelectChoice('B');
      } else if (key === 'C' || key === '3') {
        e.preventDefault();
        onSelectChoice('C');
      } else if (key === 'D' || key === '4') {
        e.preventDefault();
        onSelectChoice('D');
      } else if (key === 'M' || key === 'F') {
        e.preventDefault();
        onToggleBookmark();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSelectChoice, onNext, onPrev, onToggleBookmark, enabled]);
}
