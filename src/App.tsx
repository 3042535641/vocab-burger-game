import { useEffect, useMemo, useState } from 'react'
import BurgerStation from './components/BurgerStation'
import CustomerQueue from './components/CustomerQueue'
import OrderTicket from './components/OrderTicket'
import QuizPanel from './components/QuizPanel'
import WordManager from './components/WordManager'
import { words } from './data/words'
import type { WordEntry } from './data/words'
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
const basePatience = 75
const bossPatience = 58
const correctScore = 12
const comboBonus = 3
const wrongPenalty = 5
const customWordsStorageKey = 'vocab-burger-custom-words'
const recordsStorageKey = 'vocab-burger-records'

type GameRecords = {
  highScore: number
  bestCombo: number
  wins: number
  rounds: number
  history: Array<{
    score: number
    bestCombo: number
    servedCount: number
    bossDefeated: boolean
    playedAt: string
  }>
}

const defaultRecords: GameRecords = {
  highScore: 0,
  bestCombo: 0,
  wins: 0,
  rounds: 0,
  history: [],
}

const categoryLabels: Record<WordEntry['category'], string> = {
  food: '食材',
  action: '动作',
  shop: '店铺',
  feeling: '情绪',
}

const customerProfiles = [
  { name: '小明', avatar: 'round' },
  { name: '安娜', avatar: 'star' },
  { name: 'Leo', avatar: 'cap' },
  { name: '糖糖', avatar: 'bow' },
  { name: '阿杰', avatar: 'shade' },
  { name: 'Mia', avatar: 'bun' },
]

const idleLines = [
  '老板，来个能背会单词的汉堡。',
  '我饿了，但我更怕考试。',
  '快点快点，我的胃在背单词。',
  '这家店怎么还考英语？离谱但上头。',
]

const correctLines = [
  '可以，这口知识有嚼劲。',
  '答对了，给你打个精神小费。',
  '这波像开了单词挂。',
  '汉堡和脑子都熟了。',
]

const wrongLines = [
  '啊？这个答案把我耐心煎焦了。',
  '别乱点，我不是实验汉堡。',
  '我的沉默震耳欲聋。',
  '这题错得很有节目效果。',
]

const bossLines = [
  '我来了，题目加辣，耐心减半。',
  '答错一次，我就用眼神煎肉饼。',
  '让我看看谁是背词区传奇。',
]

const bossVictoryLines = [
  'Boss 破防：这汉堡怎么还带知识点暴击？',
  '全班认证：你把 Boss 和生词一起煎熟了。',
  '今日名场面：Vocab Burger 店长封神。',
]

const pickLine = (lines: string[], seed: number) => lines[seed % lines.length]

const getWaitingLine = (customer: Customer, seed: number) => {
  const waitedSeconds = customer.maxPatience - customer.patience

  if (customer.isBoss) {
    return waitedSeconds >= 20
      ? 'Boss：20 秒了，还没好？我开始加压了。'
      : pickLine(bossLines, seed)
  }

  if (customer.patience <= 12) {
    return '再不上菜，我就把菜单背下来投诉。'
  }

  if (waitedSeconds >= 20) {
    return '我已经等 20 秒了，lettuce 都快拼成 le-t-tu-ce 了。'
  }

  return customer.speech
}

const loadCustomWords = (): WordEntry[] => {
  try {
    const rawWords = window.localStorage.getItem(customWordsStorageKey)

    if (!rawWords) {
      return []
    }

    const parsedWords = JSON.parse(rawWords) as WordEntry[]

    return parsedWords.filter(
      (word) =>
        word.id &&
        word.chinese &&
        word.english &&
        Array.isArray(word.wrongOptions) &&
        word.wrongOptions.length >= 3,
    )
  } catch {
    return []
  }
}

const loadRecords = (): GameRecords => {
  try {
    const rawRecords = window.localStorage.getItem(recordsStorageKey)

    if (!rawRecords) {
      return defaultRecords
    }

    return { ...defaultRecords, ...(JSON.parse(rawRecords) as GameRecords) }
  } catch {
    return defaultRecords
  }
}

const saveCustomWords = (nextWords: WordEntry[]) => {
  window.localStorage.setItem(customWordsStorageKey, JSON.stringify(nextWords))
}

const saveRecords = (nextRecords: GameRecords) => {
  window.localStorage.setItem(recordsStorageKey, JSON.stringify(nextRecords))
}

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

const getRandomDelay = (served: number) => {
  const pressure = Math.min(served, targetRegularServed - 1) * 400
  const baseDelay = Math.max(8000, 10000 - pressure)
  return baseDelay + Math.floor(Math.random() * 5000)
}

const pickWordForStep = (
  wordId: string,
  index: number,
  isBoss: boolean,
  wordPool: WordEntry[],
) => {
  const customWords = wordPool.filter((word) => word.id.startsWith('custom-'))
  const shouldUseCustom =
    customWords.length > 0 &&
    !['bun', 'patty', 'flip'].includes(wordId) &&
    (index + (isBoss ? 1 : 0)) % 2 === 1

  if (shouldUseCustom) {
    return customWords[index % customWords.length]
  }

  return wordPool.find((entry) => entry.id === wordId) ?? words[0]
}

const buildSteps = (isBoss: boolean, wordPool: WordEntry[]): BurgerStep[] => {
  const ids = isBoss ? bossStepWordIds : stepWordIds

  return ids.map((wordId, index) => {
    const word = pickWordForStep(wordId, index, isBoss, wordPool)

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

const createCustomer = (
  id: number,
  forceBoss = false,
  wordPool: WordEntry[] = words,
): Customer => {
  const isBoss = forceBoss
  const maxPatience = isBoss ? bossPatience : basePatience
  const profile = customerProfiles[id % customerProfiles.length]

  return {
    id,
    name: isBoss ? 'Boss 老板同学' : profile.name,
    avatar: isBoss ? 'boss' : profile.avatar,
    speech: isBoss ? pickLine(bossLines, id) : pickLine(idleLines, id),
    patience: maxPatience,
    maxPatience,
    stepIndex: 0,
    doneness: 0,
    burn: 0,
    mistakes: 0,
    isBoss,
    steps: buildSteps(isBoss, wordPool),
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
  const [view, setView] = useState<'game' | 'words'>('game')
  const [customWords, setCustomWords] = useState<WordEntry[]>(loadCustomWords)
  const [records, setRecords] = useState<GameRecords>(loadRecords)
  const [showTutorial, setShowTutorial] = useState(false)
  const [finalizedRound, setFinalizedRound] = useState(false)
  const [victoryLine, setVictoryLine] = useState('')
  const [impactText, setImpactText] = useState('')
  const [impact, setImpact] = useState<
    'correct' | 'wrong' | 'serve' | 'victory' | null
  >(null)
  const wordPool = useMemo(() => [...words, ...customWords], [customWords])
  const previewWords = useMemo(() => {
    const previewIds = new Set([...stepWordIds, ...bossStepWordIds])
    const pickedWords = wordPool.filter(
      (word) => previewIds.has(word.id) || word.id.startsWith('custom-'),
    )

    return pickedWords.filter(
      (word, index, list) =>
        list.findIndex((item) => item.english === word.english) === index,
    )
  }, [wordPool])

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
      gameAudio.setIntensity(0)
      return
    }

    const comboHeat = Math.min(combo / 8, 1)
    const bossHeat = bossSpawned && !bossDefeated ? 0.45 : 0
    gameAudio.setIntensity(Math.max(comboHeat, bossHeat))
  }, [bossDefeated, bossSpawned, combo, gameStatus])

  useEffect(() => {
    if (gameStatus !== 'ended' || finalizedRound) {
      return
    }

    const timer = window.setTimeout(() => {
      const nextRecords: GameRecords = {
        highScore: Math.max(records.highScore, score),
        bestCombo: Math.max(records.bestCombo, bestCombo),
        wins: records.wins + (bossDefeated ? 1 : 0),
        rounds: records.rounds + 1,
        history: [
          {
            score,
            bestCombo,
            servedCount,
            bossDefeated,
            playedAt: new Date().toISOString(),
          },
          ...records.history,
        ].slice(0, 5),
      }

      setRecords(nextRecords)
      saveRecords(nextRecords)
      setFinalizedRound(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [
    bestCombo,
    bossDefeated,
    finalizedRound,
    gameStatus,
    records,
    score,
    servedCount,
  ])

  useEffect(() => {
    if (gameStatus !== 'playing' || view !== 'game') {
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
              ? Math.min(100, customer.doneness + 7)
              : customer.doneness
          const nextBurn = isPattyWaiting
            ? Math.min(100, customer.burn + (nextDoneness >= 70 ? 3 : 1))
            : customer.burn

          if (nextPatience <= 0) {
            escapedCount += 1
            bossEscaped = bossEscaped || customer.isBoss
            continue
          }

          const nextCustomer = {
            ...customer,
            patience: nextPatience,
            doneness: nextDoneness,
            burn: nextBurn,
          }

          remainingCustomers.push({
            ...nextCustomer,
            speech: getWaitingLine(nextCustomer, customer.id + nextPatience),
          })
        }

        if (escapedCount > 0) {
          setLostCustomers((count) => count + escapedCount)
          setCombo(0)
          setFeedback({
            kind: 'wrong',
            message: bossEscaped
              ? 'Boss 等到爆炸离开了，营业失败。'
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
  }, [gameStatus, view])

  useEffect(() => {
    if (
      gameStatus !== 'playing' ||
      view !== 'game' ||
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

        const newCustomer = createCustomer(nextCustomerId, false, wordPool)
        setNextCustomerId((id) => id + 1)
        setBanner(
          servedCount >= 4 ? '高峰期来了，新顾客加速进店！' : '新顾客进店了',
        )
        gameAudio.playArrival()

        if (!activeCustomerId) {
          setActiveCustomerId(newCustomer.id)
        }

        return [...currentCustomers, newCustomer]
      })
    }, getRandomDelay(servedCount))

    return () => window.clearTimeout(spawnTimer)
  }, [
    activeCustomerId,
    bossSpawned,
    gameStatus,
    nextCustomerId,
    servedCount,
    customers.length,
    wordPool,
    view,
  ])

  const triggerImpact = (
    kind: 'correct' | 'wrong' | 'serve' | 'victory',
    text = '',
  ) => {
    const impactDurations = {
      correct: 1100,
      wrong: 1300,
      serve: 1400,
      victory: 21000,
    }

    setImpact(kind)
    setImpactText(text)
    window.setTimeout(
      () => {
        setImpact(null)
        setImpactText('')
      },
      impactDurations[kind],
    )
  }

  const handleAddWord = (word: WordEntry) => {
    const exists = wordPool.some(
      (item) => item.english.toLowerCase() === word.english.toLowerCase(),
    )

    if (exists) {
      return false
    }

    setCustomWords((currentWords) => {
      const nextWords = [...currentWords, word]
      saveCustomWords(nextWords)
      return nextWords
    })

    return true
  }

  const handleDeleteWord = (id: string) => {
    setCustomWords((currentWords) => {
      const nextWords = currentWords.filter((word) => word.id !== id)
      saveCustomWords(nextWords)
      return nextWords
    })
  }

  const startGame = () => {
    const firstCustomer = createCustomer(1, false, wordPool)

    setView('game')

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
    setFinalizedRound(false)
    setVictoryLine('')
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
    const boss = createCustomer(id, true, wordPool)

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

    if (musicEnabled) {
      gameAudio.startBossMusic()
    }
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
    gameAudio.playServe(perfectBonus > 0)
    triggerImpact('serve', perfectBonus ? 'PERFECT!' : '出餐！')

    if (customer.isBoss) {
      const line = pickLine(bossVictoryLines, score + nextCombo)
      setBossDefeated(true)
      setVictoryLine(line)
      setBanner(line)
      gameAudio.playVictory()
      triggerImpact('victory', 'Boss 破防！')
      window.setTimeout(() => {
        gameAudio.stopMusic()
        setGameStatus('ended')
      }, 21000)
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
        speech: pickLine(correctLines, activeCustomer.id + nextCombo),
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
      setBanner(nextCombo >= 5 ? '锦旗进度达成！继续连对！' : '继续制作下一步')
      gameAudio.playCorrect(nextCombo)
      triggerImpact('correct', nextCombo >= 3 ? `Combo x${nextCombo}` : 'HIT!')
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
          speech: customer.isBoss
            ? pickLine(bossLines, customer.mistakes + customer.id + 1)
            : pickLine(wrongLines, customer.mistakes + customer.id + 1),
          patience: Math.max(1, customer.patience - 4),
          doneness:
            customer.steps[customer.stepIndex]?.id === 'patty' || isPattyWaiting
              ? Math.min(100, customer.doneness + 6)
              : customer.doneness,
          burn: isPattyWaiting ? Math.min(100, customer.burn + 8) : customer.burn,
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
    gameAudio.playWrong(activeCustomer.isBoss)
    triggerImpact('wrong', activeCustomer.isBoss ? 'Boss 暴击！' : 'MISS!')
  }

  const toggleMusic = () => {
    setMusicEnabled((enabled) => {
      if (enabled) {
        gameAudio.stopMusic()
        return false
      }

      if (gameStatus === 'playing') {
        if (bossSpawned && !bossDefeated) {
          gameAudio.startBossMusic()
        } else {
          gameAudio.startMusic()
        }
      }

      return true
    })
  }

  const openWordManager = () => {
    gameAudio.stopMusic()
    setView('words')
  }

  const closeWordManager = () => {
    setView('game')

    if (gameStatus === 'playing' && musicEnabled) {
      if (bossSpawned && !bossDefeated) {
        gameAudio.startBossMusic()
      } else {
        gameAudio.startMusic()
      }
    }
  }

  const tutorial = (
    <div
      className="tutorial-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <section className="panel tutorial-panel">
        <p className="eyebrow">课堂规则速通</p>
        <h2 id="tutorial-title">开店前先看三条</h2>
        <ol>
          <li>看中文选英文，答对才会推进汉堡步骤；答错扣分、扣耐心，还可能把肉饼煎焦。</li>
          <li>肉饼熟度到 55%-85%、焦度低于 45 时翻面最香，能拿 Perfect Burger 加分。</li>
          <li>普通顾客约 20 秒开始着急，完成 6 位后 Boss 登场；打败 Boss 进入结算。</li>
        </ol>
        <button
          type="button"
          className="primary-action"
          onClick={() => setShowTutorial(false)}
        >
          懂了，开煎
        </button>
      </section>
    </div>
  )

  if (view === 'words') {
    return (
      <WordManager
        customWords={customWords}
        onAddWord={handleAddWord}
        onDeleteWord={handleDeleteWord}
        onClose={closeWordManager}
      />
    )
  }

  if (gameStatus === 'idle') {
    return (
      <main className="game-shell start-screen">
        <section className="panel intro-panel start-dashboard" aria-labelledby="game-title">
          <div className="intro-hero">
            <div>
              <p className="eyebrow">Vocab Burger Shop</p>
              <h1 id="game-title">单词汉堡店</h1>
              <p>
                顾客会随机排队点餐。先看本局单词，再看中文选英文，
                答对才能完成汉堡动作；答错会扣分、掉耐心，还可能把肉饼煎焦。
              </p>
            </div>
            <div className="start-mascot" aria-hidden="true">
              <span>背词</span>
            </div>
          </div>

          <div className="record-strip" aria-label="历史记录">
            <span>最高分 {records.highScore}</span>
            <span>最佳 Combo {records.bestCombo}</span>
            <span>通关 {records.wins}/{records.rounds}</span>
          </div>

          <section className="word-preview" aria-labelledby="preview-title">
            <div className="section-heading">
              <h2 id="preview-title">本局单词预习</h2>
              <span>{previewWords.length} 个词</span>
            </div>
            <div className="preview-grid">
              {previewWords.map((word) => (
                <article className="preview-card" key={word.id}>
                  <strong>{word.chinese}</strong>
                  <span>{word.english}</span>
                  <small>
                    {categoryLabels[word.category]} / 难度 {word.difficulty}
                  </small>
                </article>
              ))}
            </div>
          </section>

          <div className="start-actions">
            <button type="button" className="primary-action" onClick={startGame}>
              开始营业
            </button>
            <button
              type="button"
              className="small-action"
              onClick={() => setShowTutorial(true)}
            >
              规则说明
            </button>
            <button type="button" className="small-action" onClick={openWordManager}>
              管理词库
            </button>
          </div>
        </section>
        {showTutorial && tutorial}
      </main>
    )
  }

  if (gameStatus === 'ended') {
    return (
      <main className={`game-shell start-screen ${bossDefeated ? 'victory-result' : ''}`}>
        <section className="panel intro-panel result-panel" aria-labelledby="result-title">
          <p className="eyebrow">{bossDefeated ? 'Boss 破防结算' : '营业结算'}</p>
          <h1 id="result-title">今日得分：{score}</h1>
          <p>
            完成 {servedCount} 份普通汉堡，流失 {lostCustomers} 位顾客，最高连对{' '}
            {bestCombo} 题。
          </p>
          <p>
            {bossDefeated
              ? victoryLine || 'Boss 已完成，适合课堂展示收尾。'
              : 'Boss 未完成，可以再开一局。'}
          </p>
          <div className="record-strip" aria-label="历史记录">
            <span>历史最高 {Math.max(records.highScore, score)}</span>
            <span>历史 Combo {Math.max(records.bestCombo, bestCombo)}</span>
            <span>
              通关次数 {records.wins + (finalizedRound ? 0 : bossDefeated ? 1 : 0)}
            </span>
          </div>
          <button type="button" className="primary-action" onClick={startGame}>
            再开一局
          </button>
          <button
            type="button"
            className="small-action manager-shortcut"
            onClick={openWordManager}
          >
            管理词库
          </button>
        </section>
      </main>
    )
  }

  return (
    <main
      className={`game-shell play-shell ${impact ? `impact-${impact}` : ''} ${
        combo >= 3 ? 'combo-hot' : ''
      } ${bossSpawned && !bossDefeated ? 'boss-mode' : ''}`}
    >
      {impact === 'victory' && (
        <div className="victory-show" aria-live="assertive">
          <div className="victory-spotlight" />
          <div className="victory-confetti" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="victory-speedlines" aria-hidden="true" />
          <div className="victory-boss-cutin" aria-hidden="true">
            <span>Boss</span>
          </div>
          <div className="victory-card">
            <small>FINAL VERDICT</small>
            <p>破防判定！</p>
            <strong>证据：Perfect Burger</strong>
            <span>全班欢呼 + 知识点暴击 + Boss 当场沉默</span>
          </div>
          <div className="victory-evidence" aria-hidden="true">
            <strong>EXHIBIT A</strong>
            <span>100% 熟词汉堡</span>
          </div>
        </div>
      )}
      {impactText && impact !== 'victory' && (
        <div className={`hit-text hit-${impact}`}>{impactText}</div>
      )}
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
          <button
            type="button"
            className="small-action"
            onClick={() => setShowTutorial(true)}
          >
            规则
          </button>
          <button type="button" className="small-action" onClick={openWordManager}>
            词库
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
      {showTutorial && tutorial}
    </main>
  )
}

export default App
