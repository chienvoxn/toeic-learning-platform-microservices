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
      // Don't trigger shortcuts if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      // Choice selection: A, B, C, D or 1, 2, 3, 4
      if (key === 'A' || key === '1') {
        e.preventDefault();
        onSelectChoice('A');
      } else if (key === 'B' && !e.ctrlKey && !e.metaKey) {
        // Distinguish Bookmark vs Choice B:
        // Use key 'B' for Choice B or Bookmark?
        // Standard convention: 1-4 for choices, or A-D. Let's make A/B/C/D map to choices, 'M' or 'K' for bookmark, OR if user presses B, toggle bookmark only if not selecting choice?
        // Let's support both cleanly: A, B, C, D selects choices. Key 'M' (Mark) or 'F' (Flag) or Ctrl+B toggles bookmark.
        e.preventDefault();
        onSelectChoice('B');
      } else if (key === 'C' || key === '3') {
        e.preventDefault();
        onSelectChoice('C');
      } else if (key === 'D' || key === '4') {
        e.preventDefault();
        onSelectChoice('D');
      } else if (key === '2') {
        e.preventDefault();
        onSelectChoice('B');
      } else if (key === 'M' || key === 'F') {
        // M or F for Mark/Flag
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
