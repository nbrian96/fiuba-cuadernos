import type { QuizManifest } from "@/schemas/academic";

export type QuizQuestion = QuizManifest["questions"][number];

export interface QuizState {
  currentIndex: number;
  score: number;
  answeredCount: number;
  selectedOptionKey: string | null;
  lastAnswerCorrect: boolean | null;
  completed: boolean;
}

export function createInitialQuizState(): QuizState {
  return {
    currentIndex: 0,
    score: 0,
    answeredCount: 0,
    selectedOptionKey: null,
    lastAnswerCorrect: null,
    completed: false,
  };
}

export function getCurrentQuestion(
  quiz: QuizManifest,
  state: QuizState,
): QuizQuestion | null {
  return quiz.questions[state.currentIndex] ?? null;
}

export function submitQuizAnswer(
  state: QuizState,
  quiz: QuizManifest,
  selectedKey: string,
): QuizState {
  if (state.completed || state.selectedOptionKey !== null) {
    return state;
  }

  const question = getCurrentQuestion(quiz, state);
  if (!question) {
    return state;
  }

  const optionExists = quiz.options.some((opt) => opt.key === selectedKey);
  if (!optionExists) {
    return state;
  }

  const isCorrect = selectedKey === question.answer;
  return {
    ...state,
    score: isCorrect ? state.score + 1 : state.score,
    answeredCount: state.answeredCount + 1,
    selectedOptionKey: selectedKey,
    lastAnswerCorrect: isCorrect,
  };
}

export function advanceQuiz(state: QuizState, quiz: QuizManifest): QuizState {
  if (state.completed || state.selectedOptionKey === null) {
    return state;
  }

  if (state.currentIndex < quiz.questions.length - 1) {
    return {
      ...state,
      currentIndex: state.currentIndex + 1,
      selectedOptionKey: null,
      lastAnswerCorrect: null,
    };
  }

  return {
    ...state,
    completed: true,
  };
}

export function computeQuizPercent(state: QuizState, quiz: QuizManifest): number {
  const total = quiz.questions.length;
  if (total <= 0) return 0;
  return Math.round((state.score / total) * 100);
}

export function isQuizPassed(state: QuizState, quiz: QuizManifest): boolean {
  return computeQuizPercent(state, quiz) >= quiz.passThresholdPercent;
}
