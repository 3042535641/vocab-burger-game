import { useEffect, useMemo, useState } from 'react'
import BurgerStation from './components/BurgerStation'
import CustomerQueue from './components/CustomerQueue'
import OrderTicket from './components/OrderTicket'
import QuizPanel from './components/QuizPanel'
import { words } from './data/words'
import type {
  AnswerQuestion,
  BurgerStep,
  Customer,
  Feedback,
  GameStatus,
} from './types/game'
import { gameAudio } from './utils/audio'
import './App.css'

const maxCustomers = 3
const targetRegularServed = 6
const basePatience = 62
const bossPatience = 46
const correctScore = 12
const comboBonus = 3
const wrongPenalty = 5

const customerProfiles = [
  { name: '小明', avatar: 'round' },
  { name: '安娜', avatar: 'star' },
  { name: 'Leo', avatar: 'cap' },
  { name: '糖糖', avatar: 'bow' },
  { name: '阿杰', avatar: 'shade' },
  { name: 'Mia', avatar: 'bun' },
]

const stepWordIds = ['bun', 'patty', 'flip', 'lettuce', 'tomato', 'sauce']
const bossStepWordIds = [
  'bun',
  'patty',
  'flip',
  'lettuce',
  'tomato',
  'sauce',
  'perfect',
]

const getRandomDelay = () => 8000 + Math.floor(Math.random() * 6000)

const buildSteps = (isBoss: boolean): BurgerStep[] => {
  const ids = isBoss ? bossStepWordIds : stepWordIds

  return ids.map((wordId) => {
    const word = words.find((entry) => entry.id === wordId) ?? words[0]

    const stepText: Record<string, { label: string; ingredient: string }> = {
      bun: { label: '放面包底', ingredient: '面包底' },
      patty: { label: '放肉饼开始煎', ingredient: '肉饼' },
      flip: { label: '答对才能翻面', ingredient: '完美翻面' },
      lettuce: { label: '放生菜', ingredient: '生菜' },
      tomato: { label: '放番茄', ingredient: '番茄' },
      sauce: { label: '挤酱并盖上面包', ingredient: '酱汁 + 面包盖' },
      perfect: { label: '喊出完美汉堡', ingredient: 'Perfect Burger' },
    }

    return {
      id: wordId === 'perfect' ? 'top' : wordId,
      label: stepText[wordId].label,
      ingredient: stepText[wordId].ingredient,
      stationText: `订单提示：${word.chinese}`,
      word,
    }
  })
}

const createCustomer = (id: number, forceBoss = false): Customer => {
  const isBoss = forceBoss
  const maxPatience = isBoss ? bossPatience : basePatience
  const profile = customerProfiles[id % customerProfiles.length]

  return {
    id,
    name: isBoss ? 'Boss 老板同学' : profile.name,
    avatar: isBoss ? 'boss' : profile.avatar,
    patience: maxPatience,
    maxPatience,
    stepIndex: 0,
    doneness: 0,
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
  const [bossSpawned, setBossSpawned] = useState(false)
  const [bossDefeated, setBossDefeated] = useState(false)
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
  const goalText = bossSpawned
    ? bossDefeated
      ? 'Boss 已完成'
      : 'Boss 战进行中'
    : `目标：${servedCount}/${targetRegularServed}`

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
        let bossEscaped = false

        for (const customer of currentCustomers) {
          const isPattyWaiting =
            customer.steps[customer.stepIndex]?.id === 'flip'
          const nextPatience = customer.patience - 1
          const nextDoneness =
            customer.steps[customer.stepIndex]?.id === 'patty' || isPattyWaiting
              ? Math.min(100, customer.doneness + 9)
              : customer.doneness
          const nextBurn = isPattyWaiting
            ? Math.min(
                100,
                customer.burn + (nextDoneness >= 70 ? 4 : 1),
              )
            : customer.burn

          if (nextPatience <= 0) {
            escapedCount += 1
            bossEscaped = bossEscaped || customer.isBoss
            continue
          }

          remainingCustomers.push({
            ...customer,
            patience: nextPatience,
            doneness: nextDoneness,
            burn: nextBurn,
          })
        }

        if (escapedCount > 0) {
          setLostCustomers((count) => count + escapedCount)
          setCombo(0)
          setFeedback({
            kind: 'wrong',
            message: bossEscaped
              ? 'Boss 等到爆炸离开了，营业失败！'
              : '有顾客等太久离开了！',
          })
          setBanner(bossEscaped ? 'Boss 战失败' : '队伍流失，节奏要稳住')

          if (bossEscaped) {
            setGameStatus('ended')
            gameAudio.stopMusic()
          }
        }

        return remainingCustomers
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [gameStatus])

  useEffect(() => {
    if (
      gameStatus !== 'playing' ||
      bossSpawned ||
      servedCount >= targetRegularServed
    ) {
      return
    }

    const spawnTimer = window.setTimeout(() => {
      setCustomers((currentCustomers) => {
        if (currentCustomers.length >= maxCustomers) {
          return currentCustomers
        }

        const newCustomer = createCustomer(nextCustomerId)
        setNextCustomerId((id) => id + 1)
        setBanner('新顾客进店了')
        gameAudio.playArrival()

        if (!activeCustomerId) {
          setActiveCustomerId(newCustomer.id)
        }

        return [...currentCustomers, newCustomer]
      })
    }, getRandomDelay())

    return () => window.clearTimeout(spawnTimer)
  }, [
    activeCustomerId,
    bossSpawned,
    gameStatus,
    nextCustomerId,
    servedCount,
    customers.length,
  ])

  const triggerImpact = (kind: 'correct' | 'wrong' | 'serve') => {
    setImpact(kind)
    window.setTimeout(() => setImpact(null), kind === 'wrong' ? 280 : 240)
  }

  const startGame = () => {
    const firstCustomer = createCustomer(1)

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
    setBossSpawned(false)
    setBossDefeated(false)
    setFeedback(null)
    setBanner('第一位顾客来了，完成 6 份普通订单后 Boss 登场')
  }

  const endGame = () => {
    gameAudio.stopMusic()
    setGameStatus('ended')
    setCustomers([])
    setActiveCustomerId(undefined)
    setBanner('今日营业结束')
  }

  const spawnBoss = (id: number) => {
    const boss = createCustomer(id, true)

    setBossSpawned(true)
    setNextCustomerId(id + 1)
    setCustomers([boss])
    setActiveCustomerId(boss.id)
    setBanner('超级顾客 Boss 登场：完成这单就结算！')
    setFeedback({
      kind: 'info',
      message: 'Boss 订单更多，耐心更短，答错会被嘲讽。',
    })
    gameAudio.playBoss()
  }

  const finishBurger = (customer: Customer, nextCombo: number) => {
    const burnPenalty = customer.burn >= 80 ? 25 : customer.burn >= 45 ? 10 : 0
    const patienceBonus = Math.max(0, Math.round(customer.patience / 2))
    const perfectBonus =
      customer.mistakes === 0 &&
      customer.burn < 45 &&
      customer.doneness >= 55 &&
      customer.doneness <= 85
        ? 30
        : 0
    const bossBonus = customer.isBoss ? 80 : 0
    const gainedScore = Math.max(
      8,
      35 + patienceBonus + perfectBonus + bossBonus - burnPenalty,
    )
    const nextServedCount = customer.isBoss ? servedCount : servedCount + 1

    setScore((currentScore) => currentScore + gainedScore)
    setCustomers((currentCustomers) =>
      currentCustomers.filter((item) => item.id !== customer.id),
    )
    setFeedback({
      kind: perfectBonus ? 'correct' : 'info',
      message: perfectBonus
        ? `Perfect Burger！额外加 ${perfectBonus} 分`
        : `汉堡完成，获得 ${gainedScore} 分`,
    })
    gameAudio.playServe()
    triggerImpact('serve')

    if (customer.isBoss) {
      setBossDefeated(true)
      setBanner('Boss 被征服，课堂汇报胜利！')
      window.setTimeout(() => {
        gameAudio.stopMusic()
        setGameStatus('ended')
      }, 900)
      return
    }

    setServedCount(nextServedCount)

    if (nextServedCount >= targetRegularServed) {
      spawnBoss(nextCustomerId)
      return
    }

    setBanner(
      nextCombo >= 5
        ? '连续答对 5 题，获得课堂锦旗！'
        : `已完成 ${nextServedCount}/${targetRegularServed}，继续营业`,
    )
  }

  const handleAnswer = (answer: string) => {
    if (!activeCustomer || !activeQuestion) {
      return
    }

    const isCorrect = answer === activeQuestion.correctAnswer

    if (isCorrect) {
      const nextCombo = combo + 1
      const step = activeCustomer.steps[activeCustomer.stepIndex]
      const isPerfectFlip =
        step.id === 'flip' &&
        activeCustomer.doneness >= 55 &&
        activeCustomer.doneness <= 85 &&
        activeCustomer.burn < 45

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
        message:
          step.id === 'flip'
            ? isPerfectFlip
              ? '完美翻面！熟度刚刚好。'
              : '翻面成功，但熟度不是最佳窗口。'
            : '答对了，动作完成！',
      })
      setBanner(nextCombo >= 5 ? '锦旗进度达成：5 连对！' : '继续制作下一步')
      gameAudio.playCorrect()
      triggerImpact('correct')
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
          doneness:
            customer.steps[customer.stepIndex]?.id === 'patty' || isPattyWaiting
              ? Math.min(100, customer.doneness + 8)
              : customer.doneness,
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
    triggerImpact('wrong')
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
        <section className="panel intro-panel result-panel" aria-labelledby="result-title">
          <p className="eyebrow">营业结算</p>
          <h1 id="result-title">今日得分：{score}</h1>
          <p>
            完成 {servedCount} 份普通汉堡，流失 {lostCustomers} 位顾客，最高连对{' '}
            {bestCombo} 题。
          </p>
          <p>
            {bossDefeated
              ? 'Boss 已完成，适合课堂展示收尾。'
              : 'Boss 未完成，可以再开一局。'}
          </p>
          <button type="button" className="primary-action" onClick={startGame}>
            再开一局
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className={`game-shell play-shell ${impact ? `impact-${impact}` : ''}`}>
      <header className="game-header">
        <div className="title-lockup">
          <p className="eyebrow">课堂汇报版</p>
          <h1>单词汉堡店</h1>
        </div>
        <div className="stats" aria-label="游戏状态">
          <span>得分 {score}</span>
          <span>Combo {combo}</span>
          <span>{goalText}</span>
          <button type="button" className="small-action" onClick={toggleMusic}>
            {musicEnabled ? '音乐开' : '音乐关'}
          </button>
          <button type="button" className="small-action" onClick={endGame}>
            结束营业
          </button>
        </div>
      </header>

      <section className="shop-scene compact-scene" aria-label="汉堡店场景">
        <div className="shop-sign">VOCAB BURGER</div>
        <div className="awning" aria-hidden="true" />
        <div className="counter-rail" aria-hidden="true" />
      </section>

      <div className="banner">{banner}</div>

      <div className="shop-layout">
        <CustomerQueue
          customers={customers}
          activeCustomerId={activeCustomer?.id}
          onSelectCustomer={setActiveCustomerId}
        />
        <BurgerStation customer={activeCustomer} />
        <OrderTicket
          customer={activeCustomer}
          servedCount={servedCount}
          targetServed={targetRegularServed}
          bossSpawned={bossSpawned}
        />
      </div>

      <QuizPanel
        customer={activeCustomer}
        question={activeQuestion}
        feedback={feedback}
        combo={combo}
        onAnswer={handleAnswer}
      />
    </main>
  )
}

export default App
