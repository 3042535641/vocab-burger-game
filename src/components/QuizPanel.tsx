import { memo } from 'react'
import type { AnswerQuestion, Feedback } from '../types/game'

type QuizPanelProps = {
  hasCustomer: boolean
  question?: AnswerQuestion
  stationText?: string
  feedback: Feedback
  combo: number
  onAnswer: (answer: string) => void
}

function QuizPanel({
  hasCustomer,
  question,
  stationText,
  feedback,
  combo,
  onAnswer,
}: QuizPanelProps) {
  if (!hasCustomer || !question) {
    return (
      <section className="panel quiz-panel">
        <h2>单词题</h2>
        <p className="muted">有顾客点单后，这里会出现四选一题目。</p>
      </section>
    )
  }

  return (
    <section className="panel quiz-panel" aria-label="单词题">
      <div className="question-card">
        <p className="question-label">看中文，选择正确英文</p>
        <h2>{question.chinese}</h2>
        <p>{stationText}</p>
      </div>

      <div className="answer-grid">
        {question.options.map((option) => (
          <button
            type="button"
            className="answer-button"
            key={option}
            onClick={() => onAnswer(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="quiz-footer">
        <span className={`combo ${combo >= 3 ? 'combo-hot-label' : ''}`}>
          Combo x{combo}
          <span className="combo-meter" aria-hidden="true">
            <span style={{ width: `${Math.min(combo * 12.5, 100)}%` }} />
          </span>
        </span>
        {feedback && (
          <span className={`feedback ${feedback.kind}`} role="status">
            {feedback.message}
          </span>
        )}
      </div>
    </section>
  )
}

export default memo(QuizPanel)
