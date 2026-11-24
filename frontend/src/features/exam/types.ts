export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ExamState {
  currentQuestionIndex: number;
  selectedAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  bookmarks: Set<string>;
  autosaveStatus: AutosaveStatus;
  lastSavedAt: Date | null;
  saveErrorMessage: string | null;
}
