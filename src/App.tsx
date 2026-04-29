import { useEffect, useMemo, useState } from 'react'
import BurgerStation from './components/BurgerStation'
import CustomerQueue from './components/CustomerQueue'
import QuizPanel from './components/QuizPanel'
import { words } from './data/words'
import { gameAudio } from './utils/audio'
import type {
  AnswerQuestion,
  BurgerStep,
  Customer,
  Feedback,
  GameStatus,
} from './types/game'
import './App.css'

const maxCustomers = 3
const basePatience = 58
const bossPatience = 44
const correctScore = 12
const comboBonus = 3
const wrongPenalty = 5
const customerNames = ['小明', '安娜', 'Leo', '糖糖', '阿杰', 'Mia']

const stepWordIds = ['bun', 'patty', 'flip', 'lettuce', 'tomato', 'sauce']
const bossStepWordIds = ['bun', 'patty', 'flip', 'lettuce', 'tomato', 'sauce', 'perfect']

const getRandomDelay = () => 7000 + Math.floor(Math.random() * 6000)

const buildSteps = (isBoss: boolean): BurgerStep[] => {
  const ids = isBoss ? bossStepWordIds : stepWordIds

  return ids.map((wordId) => {
    const word = words.find((entry) => entry.id === wordId) ?? words[0]

    const stepText: Record<string, string> = {
      bun: '放面包底',
      patty: '放肉饼开始煎',
      flip: '答对才能翻面',
      lettuce: '放生菜',
      tomato: '放番茄',
      sauce: '挤酱并盖上面包',
      perfect: '喊出完美汉堡',
    }

    return {
      id: wordId === 'perfect' ? 'top' : wordId,
      label: stepText[wordId],
      stationText: `订单提示：${word.chinese}`,
      word,
    }
  })
}

const createCustomer = (id: number, servedCount: number): Customer => {
  const isBoss = servedCount >= 4 && id % 3 === 0
  const maxPatience = isBoss ? bossPatience : basePatience

  return {
    id,
    name: isBoss
      ? 'Boss 老板同学'
      : customerNames[Math.floor(Math.random() * customerNames.length)],
    patience: maxPatience,
    maxPatience,
    stepIndex: 0,
    burn: 0,
    mistakes: 0,
    isBoss,
    steps: buildSteps(isBoss),
  }
}

const buildQuestion = (customer?: Customer): AnswerQuestion | undefined => {
  const step = customer?.steps[customer.stepIndex]

  if (!step) {
    return undefined
  }

  const options = [step.word.english, ...step.word.wrongOptions]
  const offset = (customer.id + customer.stepIndex) % options.length

  return {
    chinese: step.word.chinese,
    correctAnswer: step.word.english,
    options: [...options.slice(offset), ...options.slice(0, offset)],
  }
}

function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [activeCustomerId, setActiveCustomerId] = useState<number>()
  const [nextCustomerId, setNextCustomerId] = useState(1)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [servedCount, setServedCount] = useState(0)
  const [lostCustomers, setLostCustomers] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [banner, setBanner] = useState('准备营业')
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [impact, setImpact] = useState<'correct' | 'wrong' | 'serve' | null>(
    null,
  )

  const activeCustomer =
    customers.find((customer) => customer.id === activeCustomerId) ??
    customers[0]
  const activeQuestion = useMemo(
    () => buildQuestion(activeCustomer),
    [activeCustomer],
  )

  useEffect(() => {
    return () => gameAudio.stopMusic()
  }, [])

  useEffect(() => {
    if (gameStatus !== 'playing') {
      return
    }

    const timer = window.setInterval(() => {
      setCustomers((currentCustomers) => {
        const remainingCustomers: Customer[] = []
        let escapedCount = 0

        for (const customer of currentCustomers) {
          const isPattyWaiting =
            customer.steps[customer.stepIndex]?.id === 'flip'
          const nextPatience = customer.patience - 1
          const nextBurn = isPattyWaiting
            ? Math.min(100, customer.burn + 2)
            : customer.burn

          if (nextPatience <= 0) {
            escapedCount += 1
            continue
          }

          remainingCustomers.push({
            ...customer,
            patience: nextPatience,
            burn: nextBurn,
          })
        }

        if (escapedCount > 0) {
          setLostCustomers((count) => count + escapedCount)
          setCombo(0)
          setFeedback({
            kind: 'wrong',
            message: '有顾客等太久离开了！',
          })
        }

        return remainingCustomers
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [gameStatus])

  useEffect(() => {
    if (gameStatus !== 'playing') {
      return
    }

    const spawnTimer = window.setTimeout(() => {
      setCustomers((currentCustomers) => {
        if (currentCustomers.length >= maxCustomers) {
          return currentCustomers
        }

        const newCustomer = createCustomer(nextCustomerId, servedCount)
        setNextCustomerId((id) => id + 1)
        setBanner(newCustomer.isBoss ? '超级顾客登场！' : '新顾客进店了')
        gameAudio.playArrival()

        if (!activeCustomerId) {
          setActiveCustomerId(newCustomer.id)
        }

        return [...currentCustomers, newCustomer]
      })
    }, getRandomDelay())

    return () => window.clearTimeout(spawnTimer)
  }, [activeCustomerId, gameStatus, nextCustomerId, servedCount, customers.length])

  const startGame = () => {
    const firstCustomer = createCustomer(1, 0)

    if (musicEnabled) {
      gameAudio.startMusic()
    }

    setGameStatus('playing')
    setCustomers([firstCustomer])
    setActiveCustomerId(firstCustomer.id)
    setNextCustomerId(2)
    setScore(0)
    setCombo(0)
    setBestCombo(0)
    setServedCount(0)
    setLostCustomers(0)
    setFeedback(null)
    setBanner('第一位顾客来了，开工！')
  }

  const endGame = () => {
    gameAudio.stopMusic()
    setGameStatus('ended')
    setCustomers([])
    setActiveCustomerId(undefined)
    setBanner('今日营业结束')
  }

  const finishBurger = (customer: Customer, nextCombo: number) => {
    const burnPenalty = customer.burn >= 80 ? 25 : customer.burn >= 45 ? 10 : 0
    const patienceBonus = Math.max(0, Math.round(customer.patience / 2))
    const perfectBonus =
      customer.mistakes === 0 && customer.burn < 45 ? 30 : 0
    const bossBonus = customer.isBoss ? 40 : 0
    const gainedScore = Math.max(
      8,
      35 + patienceBonus + perfectBonus + bossBonus - burnPenalty,
    )

    setScore((currentScore) => currentScore + gainedScore)
    setServedCount((count) => count + 1)
    setCustomers((currentCustomers) =>
      currentCustomers.filter((item) => item.id !== customer.id),
    )
    setFeedback({
      kind: perfectBonus ? 'correct' : 'info',
      message: perfectBonus
        ? `Perfect Burger！额外加 ${perfectBonus} 分`
        : `汉堡完成，获得 ${gainedScore} 分`,
    })
    setBanner(
      nextCombo >= 5
        ? '连续答对 5 题，获得课堂锦旗！'
        : customer.isBoss
          ? 'Boss 也被你的汉堡征服了！'
          : '顾客拿到汉堡离开了',
    )
    gameAudio.playServe()
    setImpact('serve')
    window.setTimeout(() => setImpact(null), 260)
  }

  const handleAnswer = (answer: string) => {
    if (!activeCustomer || !activeQuestion) {
      return
    }

    const isCorrect = answer === activeQuestion.correctAnswer

    if (isCorrect) {
      const nextCombo = combo + 1
      const step = activeCustomer.steps[activeCustomer.stepIndex]
      const isPerfectFlip = step.id === 'flip' && activeCustomer.burn < 45

      setCombo(nextCombo)
      setBestCombo((currentBest) => Math.max(currentBest, nextCombo))
      setScore(
        (currentScore) =>
          currentScore + correctScore + Math.max(0, nextCombo - 1) * comboBonus,
      )

      const nextCustomer = {
        ...activeCustomer,
        stepIndex: activeCustomer.stepIndex + 1,
      }

      if (nextCustomer.stepIndex >= nextCustomer.steps.length) {
        finishBurger(nextCustomer, nextCombo)
        return
      }

      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          customer.id === activeCustomer.id ? nextCustomer : customer,
        ),
      )
      setFeedback({
        kind: 'correct',
        message: isPerfectFlip ? '完美翻面！' : '答对了，动作完成！',
      })
      setBanner(nextCombo >= 5 ? '锦旗进度达成：5 连对！' : '继续制作下一步')
      gameAudio.playCorrect()
      setImpact('correct')
      window.setTimeout(() => setImpact(null), 220)
      return
    }

    setCombo(0)
    setScore((currentScore) => Math.max(0, currentScore - wrongPenalty))
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) => {
        if (customer.id !== activeCustomer.id) {
          return customer
        }

        const isPattyWaiting = customer.steps[customer.stepIndex]?.id === 'flip'

        return {
          ...customer,
          mistakes: customer.mistakes + 1,
          patience: Math.max(1, customer.patience - 4),
          burn: isPattyWaiting ? Math.min(100, customer.burn + 10) : customer.burn,
        }
      }),
    )
    setFeedback({
      kind: 'wrong',
      message: `答错了，正确答案是 ${activeQuestion.correctAnswer}`,
    })
    setBanner(
      activeCustomer.isBoss ? 'Boss：这都能错？再快点！' : '顾客更着急了',
    )
    gameAudio.playWrong()
    setImpact('wrong')
    window.setTimeout(() => setImpact(null), 260)
  }

  const toggleMusic = () => {
    setMusicEnabled((enabled) => {
      if (enabled) {
        gameAudio.stopMusic()
        return false
      }

      if (gameStatus === 'playing') {
        gameAudio.startMusic()
      }

      return true
    })
  }

  if (gameStatus === 'idle') {
    return (
      <main className="game-shell start-screen">
        <section className="panel intro-panel" aria-labelledby="game-title">
          <p className="eyebrow">Vocab Burger Shop</p>
          <h1 id="game-title">单词汉堡店</h1>
          <p>
            顾客会随机排队点餐。看中文选英文，答对才能完成汉堡动作；
            答错会扣分、掉耐心，还可能把肉饼煎焦。
          </p>
          <button type="button" className="primary-action" onClick={startGame}>
            开始营业
          </button>
        </section>
      </main>
    )
  }

  if (gameStatus === 'ended') {
    return (
      <main className="game-shell start-screen">
        <section className="panel intro-panel" aria-labelledby="result-title">
          <p className="eyebrow">营业结算</p>
          <h1 id="result-title">今日得分：{score}</h1>
          <p>
            完成 {servedCount} 份汉堡，流失 {lostCustomers} 位顾客，最高连对{' '}
            {bestCombo} 题。
          </p>
          <button type="button" className="primary-action" onClick={startGame}>
            再开一局
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className={`game-shell ${impact ? `impact-${impact}` : ''}`}>
      <header className="game-header">
        <div>
          <p className="eyebrow">课堂汇报版</p>
          <h1>单词汉堡店</h1>
        </div>
        <div className="stats" aria-label="游戏状态">
          <span>得分 {score}</span>
          <span>Combo {combo}</span>
          <span>完成 {servedCount}</span>
          <button type="button" className="small-action" onClick={toggleMusic}>
            {musicEnabled ? '音乐开' : '音乐关'}
          </button>
          <button type="button" className="small-action" onClick={endGame}>
            结束营业
          </button>
        </div>
      </header>

      <div className="banner">{banner}</div>

      <div className="shop-layout">
        <CustomerQueue
          customers={customers}
          activeCustomerId={activeCustomer?.id}
          onSelectCustomer={setActiveCustomerId}
        />
        <BurgerStation customer={activeCustomer} />
        <QuizPanel
          customer={activeCustomer}
          question={activeQuestion}
          feedback={feedback}
          combo={combo}
          onAnswer={handleAnswer}
        />
      </div>
    </main>
  )
}

export default App
