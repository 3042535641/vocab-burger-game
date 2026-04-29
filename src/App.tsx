import { useMemo, useState } from 'react'
import { wordQuestions } from './data/words'
import './App.css'

const burgerSteps = ['面包底', '肉饼第一面', '翻面', '放生菜', '挤酱']
const startingLives = 3
const pointsPerCorrectAnswer = 10

type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

type Feedback =
  | {
      kind: 'correct'
      message: string
    }
  | {
      kind: 'wrong'
      message: string
    }
  | null

function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [lives, setLives] = useState(startingLives)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isWaitingToContinue, setIsWaitingToContinue] = useState(false)

  const currentQuestion = wordQuestions[currentStepIndex % wordQuestions.length]
  const currentStep = burgerSteps[currentStepIndex]
  const completedSteps = useMemo(
    () => burgerSteps.slice(0, currentStepIndex),
    [currentStepIndex],
  )

  const resetGame = () => {
    setGameStatus('playing')
    setCurrentStepIndex(0)
    setLives(startingLives)
    setScore(0)
    setFeedback(null)
    setIsWaitingToContinue(false)
  }

  const finishStep = (nextScore: number) => {
    const nextStepIndex = currentStepIndex + 1

    if (nextStepIndex >= burgerSteps.length) {
      setScore(nextScore)
      setCurrentStepIndex(nextStepIndex)
      setGameStatus('won')
      setFeedback({
        kind: 'correct',
        message: '汉堡完成！这位顾客很满意。',
      })
      return
    }

    setCurrentStepIndex(nextStepIndex)
    setScore(nextScore)
    setFeedback({
      kind: 'correct',
      message: '答对了！继续制作下一层。',
    })
  }

  const handleAnswer = (answer: string) => {
    if (gameStatus !== 'playing' || isWaitingToContinue) {
      return
    }

    if (answer === currentQuestion.correctAnswer) {
      finishStep(score + pointsPerCorrectAnswer)
      return
    }

    const nextLives = lives - 1

    setLives(nextLives)
    setFeedback({
      kind: 'wrong',
      message: `答错了，正确答案是：${currentQuestion.correctAnswer}`,
    })

    if (nextLives <= 0) {
      setGameStatus('lost')
      return
    }

    setIsWaitingToContinue(true)
  }

  const continueAfterWrongAnswer = () => {
    const nextStepIndex = currentStepIndex + 1

    setIsWaitingToContinue(false)

    if (nextStepIndex >= burgerSteps.length) {
      setCurrentStepIndex(nextStepIndex)
      setGameStatus('won')
      setFeedback({
        kind: 'correct',
        message: '汉堡完成！虽然有点手忙脚乱，但顾客收到了订单。',
      })
      return
    }

    setCurrentStepIndex(nextStepIndex)
    setFeedback(null)
  }

  if (gameStatus === 'idle') {
    return (
      <main className="game-shell start-screen">
        <section className="intro-panel" aria-labelledby="game-title">
          <p className="eyebrow">Vocab Burger Shop</p>
          <h1 id="game-title">单词汉堡店</h1>
          <p className="intro-copy">
            给顾客做一份五步汉堡。每完成一步，都要答对一道四选一单词题。
          </p>
          <button type="button" className="primary-action" onClick={resetGame}>
            开始营业
          </button>
        </section>
      </main>
    )
  }

  const isGameOver = gameStatus === 'won' || gameStatus === 'lost'

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">今日订单</p>
          <h1>单词汉堡店</h1>
        </div>
        <div className="stats" aria-label="游戏状态">
          <span>生命 {lives}</span>
          <span>得分 {score}</span>
          <span>
            步骤 {Math.min(currentStepIndex + 1, burgerSteps.length)}/
            {burgerSteps.length}
          </span>
        </div>
      </header>

      <section className="counter-view" aria-label="顾客订单">
        <div className="customer-card">
          <div className="customer" role="img" aria-label="正在等待汉堡的顾客">
            <span className="customer-face">:)</span>
          </div>
          <div>
            <h2>顾客来了</h2>
            <p>订单：经典单词汉堡</p>
            <p className="order-note">请按步骤完成制作。</p>
          </div>
        </div>

        <div className="burger-station" aria-label="汉堡制作台">
          <div className="burger-stack">
            {completedSteps.includes('挤酱') && (
              <span className="burger-layer sauce">酱</span>
            )}
            {completedSteps.includes('放生菜') && (
              <span className="burger-layer lettuce">生菜</span>
            )}
            {completedSteps.includes('肉饼第一面') && (
              <span
                className={`burger-layer patty ${
                  completedSteps.includes('翻面') ? 'flipped' : ''
                }`}
              >
                肉饼
              </span>
            )}
            {completedSteps.includes('面包底') && (
              <span className="burger-layer bun">面包底</span>
            )}
            {completedSteps.length === 0 && (
              <span className="empty-plate">空盘子</span>
            )}
          </div>
          <p className="current-step">
            {isGameOver ? '制作结束' : `当前步骤：${currentStep}`}
          </p>
        </div>
      </section>

      <section className="quiz-panel" aria-label="单词题">
        {isGameOver ? (
          <div className="result-card">
            <p className="result-label">
              {gameStatus === 'won' ? '汉堡完成' : '游戏结束'}
            </p>
            <h2>
              {gameStatus === 'won'
                ? `最终得分：${score}`
                : `生命用完了，当前得分：${score}`}
            </h2>
            {feedback && (
              <p className={`feedback ${feedback.kind}`}>{feedback.message}</p>
            )}
            <button type="button" className="primary-action" onClick={resetGame}>
              再玩一次
            </button>
          </div>
        ) : (
          <>
            <div className="question-card">
              <p className="question-label">请选择这个单词的中文意思</p>
              <h2>{currentQuestion.word}</h2>
            </div>

            <div className="answer-grid">
              {currentQuestion.options.map((option) => (
                <button
                  type="button"
                  className="answer-button"
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={isWaitingToContinue}
                >
                  {option}
                </button>
              ))}
            </div>

            {feedback && (
              <div className={`feedback ${feedback.kind}`} role="status">
                {feedback.message}
              </div>
            )}

            {isWaitingToContinue && (
              <button
                type="button"
                className="primary-action compact"
                onClick={continueAfterWrongAnswer}
              >
                继续制作
              </button>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default App
