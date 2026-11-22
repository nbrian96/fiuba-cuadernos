import { useEffect, useRef, useState } from "react";
import type { QuizManifest } from "@/schemas/academic";
import {
  advanceQuiz,
  computeQuizPercent,
  createInitialQuizState,
  getCurrentQuestion,
  isQuizPassed,
  submitQuizAnswer,
  type QuizState,
} from "@/utils/quizEngine";

export interface QuickRecognitionTrainerProps {
  quiz: QuizManifest;
}

export function QuickRecognitionTrainer({ quiz }: QuickRecognitionTrainerProps) {
  const [state, setState] = useState<QuizState>(() => createInitialQuizState());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const promptRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const currentQuestion = getCurrentQuestion(quiz, state);
  const isAnswered = state.selectedOptionKey !== null;

  useEffect(() => {
    if (state.completed || isAnswered) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.completed, state.currentIndex, isAnswered]);

  const handleSelectOption = (optionKey: string) => {
    setState((prev) => submitQuizAnswer(prev, quiz, optionKey));
  };

  const handleNext = () => {
    const willComplete = state.currentIndex >= quiz.questions.length - 1;
    setElapsedSeconds(0);
    setState((prev) => advanceQuiz(prev, quiz));
    requestAnimationFrame(() => {
      if (willComplete) {
        summaryRef.current?.focus();
      } else {
        promptRef.current?.focus();
      }
    });
  };

  const handleReset = () => {
    setElapsedSeconds(0);
    setState(createInitialQuizState());
    requestAnimationFrame(() => {
      promptRef.current?.focus();
    });
  };

  const totalQuestions = quiz.questions.length;
  const percent = computeQuizPercent(state, quiz);
  const passed = isQuizPassed(state, quiz);

  return (
    <section
      id="entrenador-30s"
      className="trainer-panel"
      aria-labelledby="trainer-heading"
    >
      <div className="trainer-header">
        <div>
          <h2 id="trainer-heading" style={{ margin: 0 }}>
            {quiz.title}
          </h2>
          <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)" }}>
            Identificá el enfoque adecuado antes de {quiz.timeGoalSeconds} segundos.
          </p>
        </div>

        <div className="trainer-metrics">
          <span className="meta-pill" data-testid="trainer-score">
            Aciertos: {state.score} / {state.answeredCount}
          </span>
          <span className="meta-pill">
            Caso {Math.min(state.currentIndex + 1, totalQuestions)} de {totalQuestions}
          </span>
          <span className="meta-pill">
            Tiempo: {elapsedSeconds}s (meta &lt; {quiz.timeGoalSeconds}s)
          </span>
        </div>
      </div>

      {!state.completed && currentQuestion ? (
        <>
          <div
            ref={promptRef}
            tabIndex={-1}
            className="trainer-prompt"
            data-testid="trainer-prompt"
          >
            {currentQuestion.prompt}
          </div>

          <div
            className="trainer-options"
            role="group"
            aria-label="Opciones de paradigma"
          >
            {quiz.options.map((opt) => {
              const isCorrectOption =
                isAnswered && opt.key === currentQuestion.answer;
              const isWrongSelected =
                isAnswered &&
                opt.key === state.selectedOptionKey &&
                state.lastAnswerCorrect === false;

              const stateClass = isCorrectOption
                ? "is-correct"
                : isWrongSelected
                  ? "is-wrong"
                  : "";

              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`btn trainer-option ${stateClass}`.trim()}
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(opt.key)}
                  data-testid={`trainer-option-${opt.key}`}
                >
                  <span aria-hidden="true">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div aria-live="polite" data-testid="trainer-feedback-region">
            {isAnswered ? (
              <div
                className={`trainer-feedback ${
                  state.lastAnswerCorrect ? "is-correct" : "is-wrong"
                }`.trim()}
              >
                <strong>
                  {state.lastAnswerCorrect
                    ? `Respuesta correcta: ${currentQuestion.paradigmName}`
                    : `Paradigma recomendado: ${currentQuestion.paradigmName}`}
                </strong>
                <p className="trainer-feedback-detail">
                  <strong>Disparador de examen:</strong> {currentQuestion.trigger}
                </p>
                {currentQuestion.sourceOrigin ? (
                  <p className="trainer-feedback-detail" style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    <strong>Fuente:</strong> {currentQuestion.sourceOrigin}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {isAnswered ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                data-testid="trainer-next"
              >
                {state.currentIndex < totalQuestions - 1
                  ? `Siguiente caso (${state.currentIndex + 2}/${totalQuestions})`
                  : "Ver diagnóstico final"}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleReset}
              data-testid="trainer-reset"
            >
              Reiniciar entrenador
            </button>
          </div>
        </>
      ) : (
        <div
          ref={summaryRef}
          tabIndex={-1}
          className={`trainer-feedback ${passed ? "is-correct" : "is-wrong"}`.trim()}
          role="status"
          data-testid="trainer-summary"
        >
          <strong>
            Simulación completada: {state.score} de {totalQuestions} aciertos ({percent}%)
          </strong>
          <p className="trainer-feedback-detail">
            {passed
              ? `Superaste el umbral de aprobación (${quiz.passThresholdPercent}%).`
              : `Debajo del umbral sugerido (${quiz.passThresholdPercent}%). Repasá las pistas de reconocimiento y reintentá.`}
          </p>
          <div style={{ marginTop: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReset}
              data-testid="trainer-restart-summary"
            >
              Volver a entrenar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default QuickRecognitionTrainer;
