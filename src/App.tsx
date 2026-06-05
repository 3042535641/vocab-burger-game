import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import BurgerStation from './components/BurgerStation'
import BossFinale from './components/BossFinale'
import CustomerQueue from './components/CustomerQueue'
import OrderTicket from './components/OrderTicket'
import QuizPanel from './components/QuizPanel'
import ResultScreen from './components/ResultScreen'
import StartScreen from './components/StartScreen'
import TutorialModal from './components/TutorialModal'
import WordManager from './components/WordManager'
import {
  comboBonus,
  correctScore,
  maxCustomers,
  targetRegularServed,
  wrongPenalty,
} from './constants/game'
import { bossFinaleFrames, customerRoster } from './data/characters'
import { words } from './data/words'
import type { WordEntry } from './data/words'
import { useTimedImpact } from './hooks/useTimedImpact'
import type {
  Customer,
  Feedback,
  GameStatus,
  PortraitFrameKey,
  QueuePreviewCustomer,
} from './types/game'
import type { GameRecords } from './types/records'
import { gameAudio } from './utils/audio'
import { getServiceRank } from './utils/display'
import {
  bossLines,
  bossVictoryLines,
  buildQuestionFromStep,
  cookPatty,
  correctLines,
  createCustomer,
  getCorrectFeedbackMessage,
  getNextPattySide,
  getPressureLabel,
  getRandomDelay,
  getTargetQueueSize,
  isPerfectFlipWindow,
  pickLine,
  recipeCatalog,
  scoreBurger,
  tickCustomers,
  wrongLines,
} from './utils/gameLogic'
import {
  loadCustomWords,
  loadRecords,
  loadSettings,
  saveCustomWords,
  saveRecords,
  saveSettings,
} from './utils/storage'
import { getBossFinaleFrameSrc, getStagePortraitFrameSrc } from './utils/portraits'
import { getUniqueWordsByEnglish, normalizeEnglish } from './utils/wordHelpers'
import './pixel-vn.css'

const portraitPreloadFrames: PortraitFrameKey[] = [
  'normal',
  'waiting',
  'worried',
  'angry',
  'satisfied',
  'reactionCloseup',
]
const preloadedImages = new Set<string>()

const preloadImage = (src: string) => {
  if (!src || preloadedImages.has(src)) {
    return
  }

  preloadedImages.add(src)
  const image = new Image()
  image.decoding = 'async'
  image.src = src
}

const preloadPortraitFrames = (avatar?: string, isBoss = false) => {
  portraitPreloadFrames.forEach((frame) => {
    preloadImage(getStagePortraitFrameSrc(avatar, isBoss, frame))
  })
}

function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [activeCustomerId, setActiveCustomerId] = useState<number>()
  const [nextCustomerId, setNextCustomerId] = useState(1)
  const [nextRegularProfileIndex, setNextRegularProfileIndex] = useState(0)
  const [wordRotationOffset, setWordRotationOffset] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [servedCount, setServedCount] = useState(0)
  const [lostCustomers, setLostCustomers] = useState(0)
  const [bossSpawned, setBossSpawned] = useState(false)
  const [bossDefeated, setBossDefeated] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [banner, setBanner] = useState('准备营业')
  const [settings, setSettings] = useState(loadSettings)
  const [view, setView] = useState<'game' | 'words'>('game')
  const [customWords, setCustomWords] = useState<WordEntry[]>(loadCustomWords)
  const [records, setRecords] = useState<GameRecords>(loadRecords)
  const [showTutorial, setShowTutorial] = useState(false)
  const [finalizedRound, setFinalizedRound] = useState(false)
  const [victoryLine, setVictoryLine] = useState('')
  const [missedWords, setMissedWords] = useState<WordEntry[]>([])
  const [handoffCustomer, setHandoffCustomer] = useState<Customer>()
  const [arrivalEtaSeconds, setArrivalEtaSeconds] = useState(1)
  const { clearImpact, impact, impactText, triggerImpact } = useTimedImpact()
  const finaleTimerRef = useRef<number | undefined>(undefined)
  const handoffTimerRef = useRef<number | undefined>(undefined)
  const customerClockRef = useRef(0)
  const customersRef = useRef<Customer[]>([])
  const nextArrivalAtRef = useRef<number | undefined>(undefined)
  const nextCustomerIdRef = useRef(1)
  const regularProfileIndexRef = useRef(0)
  const wordRotationOffsetRef = useRef(0)
  const answerHandlerRef = useRef<(answer: string) => void>(() => undefined)
  const musicEnabled = settings.musicEnabled
  const performanceMode = settings.performanceMode
  const wordPool = useMemo(() => [...words, ...customWords], [customWords])
  const previewWords = useMemo(() => getUniqueWordsByEnglish(wordPool), [wordPool])
  const previewRecipes = recipeCatalog

  const setRegularProfileCursor = useCallback((index: number) => {
    regularProfileIndexRef.current = index
    setNextRegularProfileIndex(index)
  }, [])

  const setCustomerIdCursor = useCallback((id: number) => {
    nextCustomerIdRef.current = id
    setNextCustomerId(id)
  }, [])

  const reserveCustomerId = useCallback(() => {
    const id = nextCustomerIdRef.current
    setCustomerIdCursor(id + 1)
    return id
  }, [setCustomerIdCursor])

  const resetRegularProfileRoster = useCallback(
    (nextIndex: number) => {
      setRegularProfileCursor(nextIndex)
    },
    [setRegularProfileCursor],
  )

  const reserveRegularProfileIndex = useCallback(() => {
    const index = regularProfileIndexRef.current
    setRegularProfileCursor(index + 1)
    return index
  }, [setRegularProfileCursor])

  const setWordRotationCursor = useCallback((offset: number) => {
    wordRotationOffsetRef.current = offset
    setWordRotationOffset(offset)
  }, [])

  const createRoundWordRotationOffset = useCallback(() => {
    const uniqueWordCount = getUniqueWordsByEnglish(wordPool).length

    if (uniqueWordCount <= 1) {
      return 0
    }

    return Math.floor(Math.random() * uniqueWordCount)
  }, [wordPool])

  const getPreviewRegularProfileIndex = useCallback(
    (previewOffset: number, startIndex: number) => {
      return startIndex + previewOffset
    },
    [],
  )

  useEffect(() => {
    gameAudio.preload()
    customerRoster.forEach((customer) => preloadPortraitFrames(customer.avatar, false))
    preloadPortraitFrames('boss', true)
    const finaleFrameKeys = Object.keys(bossFinaleFrames) as Array<
      keyof typeof bossFinaleFrames
    >
    finaleFrameKeys.forEach((frame) => preloadImage(getBossFinaleFrameSrc(frame)))
  }, [])

  useEffect(() => {
    customersRef.current = customers
  }, [customers])

  const activeCustomer =
    customers.find((customer) => customer.id === activeCustomerId) ??
    customers[0]
  const activeQuestionStepIndex = activeCustomer?.stepIndex
  const activeStep =
    activeQuestionStepIndex === undefined
      ? undefined
      : activeCustomer?.steps[activeQuestionStepIndex]
  const activeQuestionSeed =
    (activeCustomer?.id ?? 0) + (activeQuestionStepIndex ?? 0)
  const activeQuestion = useMemo(
    () => buildQuestionFromStep(activeStep, activeQuestionSeed),
    [activeQuestionSeed, activeStep],
  )
  const goalText = bossSpawned
    ? bossDefeated
      ? 'Boss 已完成'
      : 'Boss 战进行中'
    : `目标：${servedCount}/${targetRegularServed}`
  const serviceRank = getServiceRank(score, bestCombo, lostCustomers, bossDefeated)
  const rushProgress = bossSpawned
    ? bossDefeated
      ? 100
      : Math.max(
          12,
          Math.round(
            ((activeCustomer?.stepIndex ?? 0) /
              Math.max(1, activeCustomer?.steps.length ?? 7)) *
              100,
          ),
        )
    : Math.round((servedCount / targetRegularServed) * 100)
  const pressureLabel = getPressureLabel(
    servedCount,
    customers.length,
    bossSpawned && !bossDefeated,
  )
  const queuePreviewCustomers = useMemo<QueuePreviewCustomer[]>(() => {
    if (
      view !== 'game' ||
      (gameStatus !== 'playing' && gameStatus !== 'customerHandoff') ||
      bossSpawned ||
      servedCount >= targetRegularServed
    ) {
      return []
    }

    const previewCount = Math.max(0, Math.min(2, maxCustomers - customers.length))

    const etaSeconds = Math.max(1, arrivalEtaSeconds)

    return Array.from({ length: previewCount }, (_, index) => {
      const previewProfileIndex = getPreviewRegularProfileIndex(
        index,
        nextRegularProfileIndex,
      )
      const preview = createCustomer(
        nextCustomerId + index,
        false,
        wordPool,
        previewProfileIndex,
        wordRotationOffset,
      )

      return {
        id: `preview-${preview.id}`,
        name: preview.name,
        avatar: preview.avatar,
        recipe: preview.recipe,
        etaSeconds: etaSeconds + index * 4,
        isBoss: false,
      }
    })
  }, [
    bossSpawned,
    customers.length,
    gameStatus,
    getPreviewRegularProfileIndex,
    nextCustomerId,
    nextRegularProfileIndex,
    wordRotationOffset,
    arrivalEtaSeconds,
    servedCount,
    view,
    wordPool,
  ])

  useEffect(() => {
    return () => {
      window.clearTimeout(finaleTimerRef.current)
      window.clearTimeout(handoffTimerRef.current)
      gameAudio.stopMusic()
    }
  }, [])

  useEffect(() => {
    const syncVisibility = () => {
      gameAudio.setPageVisible(document.visibilityState === 'visible')
    }

    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility)
      gameAudio.setPageVisible(true)
    }
  }, [])

  useEffect(() => {
    gameAudio.setEnabled(musicEnabled)
  }, [musicEnabled])

  useEffect(() => {
    gameAudio.setPerformanceMode(performanceMode)
  }, [performanceMode])

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
      customerClockRef.current = 0
      return
    }

    customerClockRef.current = window.performance.now()

    const timer = window.setInterval(() => {
      const now = window.performance.now()
      const elapsedSeconds = Math.floor((now - customerClockRef.current) / 1000)

      if (elapsedSeconds < 1) {
        return
      }

      customerClockRef.current += elapsedSeconds * 1000

      setCustomers((currentCustomers) => {
        let nextCustomers = currentCustomers
        let escapedCount = 0
        let bossEscaped = false

        // Keep active play fair after a background pause and ignore duplicate callbacks.
        for (let second = 0; second < Math.min(elapsedSeconds, 3); second += 1) {
          const tick = tickCustomers(nextCustomers)
          nextCustomers = tick.customers
          escapedCount += tick.escapedCount
          bossEscaped = bossEscaped || tick.bossEscaped
        }

        if (escapedCount > 0) {
          setLostCustomers((count) => count + escapedCount)
          setCombo(0)
          setFeedback({
            kind: 'wrong',
            message: bossEscaped
              ? '医学英语教授等到爆炸离开了，课堂挑战失败。'
              : '有医学生等太久走了！',
          })
          setBanner(bossEscaped ? '教授 Boss 战失败' : '医学生流失，节奏要稳住')

          if (bossEscaped) {
            setGameStatus('ended')
            gameAudio.stopMusic()
          }
        }

        setActiveCustomerId((currentActiveId) =>
          nextCustomers.some((customer) => customer.id === currentActiveId)
            ? currentActiveId
            : nextCustomers[0]?.id,
        )

        return nextCustomers
      })
    }, 250)

    return () => window.clearInterval(timer)
  }, [gameStatus, view])

  useEffect(() => {
    if (
      view !== 'game' ||
      (gameStatus !== 'playing' && gameStatus !== 'customerHandoff')
    ) {
      return
    }

    const timer = window.setInterval(() => {
      const targetArrival = nextArrivalAtRef.current
      setArrivalEtaSeconds(
        targetArrival ? Math.max(1, Math.ceil((targetArrival - Date.now()) / 1000)) : 1,
      )
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

    const targetQueueSize = getTargetQueueSize()

    if (
      customers.length >= maxCustomers ||
      customers.length >= targetQueueSize
    ) {
      return
    }

    const delay = getRandomDelay(servedCount, customers.length)
    const targetArrival = Date.now() + delay
    nextArrivalAtRef.current = targetArrival
    const etaTimer = window.setTimeout(() => {
      setArrivalEtaSeconds(
        Math.max(1, Math.ceil((targetArrival - Date.now()) / 1000)),
      )
    }, 0)

    const spawnTimer = window.setTimeout(() => {
      const currentCustomers = customersRef.current
      const targetQueueSize = getTargetQueueSize()

      if (
        currentCustomers.length >= maxCustomers ||
        currentCustomers.length >= targetQueueSize
      ) {
        return
      }

      const profileIndex = reserveRegularProfileIndex()
      const customerId = reserveCustomerId()
      const newCustomer = createCustomer(
        customerId,
        false,
        wordPool,
        profileIndex,
        wordRotationOffsetRef.current,
      )

      nextArrivalAtRef.current = undefined
      setArrivalEtaSeconds(1)
      setBanner(
        currentCustomers.length === 0
          ? '新医学生补位进店，别让锅空着！'
          : servedCount >= 4
            ? '下课高峰来了，新医学生加速进店！'
            : '新医学生进店了',
      )
      gameAudio.playArrival()

      if (!activeCustomerId || currentCustomers.length === 0) {
        setActiveCustomerId(newCustomer.id)
      }

      setCustomers((currentCustomers) => {
        const latestTargetQueueSize = getTargetQueueSize()

        if (
          currentCustomers.length >= maxCustomers ||
          currentCustomers.length >= latestTargetQueueSize
        ) {
          return currentCustomers
        }

        return [...currentCustomers, newCustomer]
      })
    }, delay)

    return () => {
      window.clearTimeout(spawnTimer)
      window.clearTimeout(etaTimer)
    }
  }, [
    activeCustomerId,
    bossSpawned,
    gameStatus,
    reserveRegularProfileIndex,
    reserveCustomerId,
    servedCount,
    customers.length,
    wordPool,
    view,
  ])

  const hasDuplicateEnglish = (word: WordEntry) =>
    wordPool.some(
      (item) =>
        item.id !== word.id &&
        normalizeEnglish(item.english) === normalizeEnglish(word.english),
    )

  const handleAddWord = (word: WordEntry) => {
    if (hasDuplicateEnglish(word)) {
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

  const handleUpdateWord = (word: WordEntry) => {
    if (hasDuplicateEnglish(word)) {
      return false
    }

    setCustomWords((currentWords) => {
      const nextWords = currentWords.map((item) =>
        item.id === word.id ? word : item,
      )
      saveCustomWords(nextWords)
      return nextWords
    })

    return true
  }

  const handleImportWords = (importedWords: WordEntry[]) => {
    const knownEnglish = new Set(
      [...words, ...customWords].map((word) => normalizeEnglish(word.english)),
    )
    const nextWords = [...customWords]
    let addedCount = 0

    for (const word of importedWords) {
      const normalizedEnglish = normalizeEnglish(word.english)

      if (!normalizedEnglish || knownEnglish.has(normalizedEnglish)) {
        continue
      }

      knownEnglish.add(normalizedEnglish)
      nextWords.push({
        ...word,
        id: word.id.startsWith('custom-')
          ? word.id
          : `custom-${Date.now()}-${addedCount}`,
        english: normalizedEnglish,
        wrongOptions: word.wrongOptions.slice(0, 3),
      })
      addedCount += 1
    }

    if (addedCount > 0) {
      setCustomWords(nextWords)
      saveCustomWords(nextWords)
    }

    return addedCount
  }

  const startGame = () => {
    const roundWordRotationOffset = createRoundWordRotationOffset()
    const firstCustomer = createCustomer(
      1,
      false,
      wordPool,
      0,
      roundWordRotationOffset,
    )
    const firstPreviewCustomer = createCustomer(
      2,
      false,
      wordPool,
      1,
      roundWordRotationOffset,
    )
    const secondPreviewCustomer = createCustomer(
      3,
      false,
      wordPool,
      2,
      roundWordRotationOffset,
    )

    window.clearTimeout(finaleTimerRef.current)
    window.clearTimeout(handoffTimerRef.current)
    window.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    clearImpact()
    setWordRotationCursor(roundWordRotationOffset)
    setView('game')
    gameAudio.unlock()
    preloadPortraitFrames(firstCustomer.avatar, false)
    preloadPortraitFrames(firstPreviewCustomer.avatar, false)
    preloadPortraitFrames(secondPreviewCustomer.avatar, false)
    preloadPortraitFrames('boss', true)

    if (musicEnabled) {
      gameAudio.startMusic()
    }

    setGameStatus('playing')
    setCustomers([firstCustomer])
    setActiveCustomerId(firstCustomer.id)
    setCustomerIdCursor(2)
    resetRegularProfileRoster(1)
    setScore(0)
    setCombo(0)
    setBestCombo(0)
    setServedCount(0)
    setLostCustomers(0)
    setBossSpawned(false)
    setBossDefeated(false)
    setFinalizedRound(false)
    setVictoryLine('')
    setMissedWords([])
    setHandoffCustomer(undefined)
    nextArrivalAtRef.current = undefined
    setFeedback(null)
    setBanner('第一位医学生来了，完成 6 份普通订单后教授 Boss 登场')
  }

  const endGame = () => {
    window.clearTimeout(finaleTimerRef.current)
    window.clearTimeout(handoffTimerRef.current)
    window.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    clearImpact()
    gameAudio.stopMusic()
    setGameStatus('ended')
    setCustomers([])
    setActiveCustomerId(undefined)
    setHandoffCustomer(undefined)
    nextArrivalAtRef.current = undefined
    setBanner('今日营业结束')
  }

  const spawnBoss = (id: number) => {
    const boss = createCustomer(
      id,
      true,
      wordPool,
      undefined,
      wordRotationOffsetRef.current,
    )

    gameAudio.stopNormalMusic()
    setGameStatus('playing')
    setBossSpawned(true)
    setHandoffCustomer(undefined)
    nextArrivalAtRef.current = undefined
    setCustomerIdCursor(Math.max(nextCustomerIdRef.current, id + 1))
    setCustomers([boss])
    setActiveCustomerId(boss.id)
    setBanner('医学英语教授 Boss 登场：完成这份终极订单就结算！')
    setFeedback({
      kind: 'info',
      message: '教授订单术语更多，耐心更短，答错会被追问词根。',
    })
    if (musicEnabled) {
      gameAudio.startBossMusic()
    }
    gameAudio.playBoss()
  }

  const finishBurger = (customer: Customer, nextCombo: number) => {
    const { gainedScore, perfectBonus } = scoreBurger(customer)
    const nextServedCount = customer.isBoss ? servedCount : servedCount + 1
    const remainingCustomers = customers.filter((item) => item.id !== customer.id)
    const completedCustomer: Customer = {
      ...customer,
      stepIndex: customer.steps.length,
      pattySide: 'done',
      speech: customer.isBoss
        ? '教授的眼镜飞了：这份医学术语汉堡竟然全都讲通了！'
        : perfectBonus > 0
          ? '好吃到词根都发光了，今天的 terminology 直接记进长期记忆。'
          : '这口汉堡可以，至少 diagnosis 没有拼成 dialogue。',
    }

    setScore((currentScore) => currentScore + gainedScore)
    setCustomers(remainingCustomers)
    setActiveCustomerId(remainingCustomers[0]?.id)
    setFeedback({
      kind: perfectBonus ? 'correct' : 'info',
      message: perfectBonus
        ? `Sterile Perfect Burger！额外加 ${perfectBonus} 分`
        : `${customer.recipe.name} 完成，获得 ${gainedScore} 分`,
    })
    gameAudio.playServe(perfectBonus > 0)
    triggerImpact('serve', perfectBonus ? 'PERFECT!' : '出餐！')

    if (customer.isBoss) {
      const line = pickLine(bossVictoryLines, score + nextCombo)
      window.clearTimeout(finaleTimerRef.current)
      window.clearTimeout(handoffTimerRef.current)
      setBossDefeated(true)
      setHandoffCustomer(undefined)
      setVictoryLine(line)
      setBanner(line)
      setGameStatus('bossFinale')
      gameAudio.playVictory()
      triggerImpact('victory', '教授破防！')
      finaleTimerRef.current = window.setTimeout(() => {
        gameAudio.stopMusic()
        setGameStatus('ended')
        clearImpact()
        finaleTimerRef.current = undefined
      }, 10000)
      return
    }

    setServedCount(nextServedCount)
    setHandoffCustomer(completedCustomer)
    setGameStatus('customerHandoff')
    setBanner(
      nextCombo >= 5
        ? '连续答对 5 题，课堂锦旗进度拉满！'
        : `已完成 ${nextServedCount}/${targetRegularServed}，下一位医学生准备翻卡进场。`,
    )

    window.clearTimeout(handoffTimerRef.current)
    handoffTimerRef.current = window.setTimeout(() => {
      setHandoffCustomer(undefined)

      if (nextServedCount >= targetRegularServed) {
        spawnBoss(reserveCustomerId())
        return
      }

      if (remainingCustomers.length === 0) {
        const profileIndex = reserveRegularProfileIndex()
        const customerId = reserveCustomerId()
        const fallbackCustomer = createCustomer(
          customerId,
          false,
          wordPool,
          profileIndex,
          wordRotationOffsetRef.current,
        )
        setCustomers([fallbackCustomer])
        setActiveCustomerId(fallbackCustomer.id)
        setBanner('下一位医学生翻卡进场，术语台继续营业。')
        gameAudio.playArrival()
      }

      setGameStatus('playing')
      handoffTimerRef.current = undefined
    }, performanceMode ? 900 : 1500)
    return
  }

  const handleAnswerInternal = (answer: string) => {
    if (gameStatus !== 'playing') {
      return
    }

    if (!activeCustomer || !activeQuestion) {
      return
    }

    const isCorrect = answer === activeQuestion.correctAnswer

    if (isCorrect) {
      const nextCombo = combo + 1
      const step = activeCustomer.steps[activeCustomer.stepIndex]
      const isPerfectFlip =
        step.id === 'flip' && isPerfectFlipWindow(activeCustomer)
      const nextCustomer = {
        ...activeCustomer,
        stepIndex: activeCustomer.stepIndex + 1,
        pattySide: getNextPattySide(activeCustomer.pattySide, step.id),
        speech: pickLine(correctLines, activeCustomer.id + nextCombo),
      }

      setCombo(nextCombo)
      setBestCombo((currentBest) => Math.max(currentBest, nextCombo))
      setScore(
        (currentScore) =>
          currentScore + correctScore + Math.max(0, nextCombo - 1) * comboBonus,
      )

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
        message: getCorrectFeedbackMessage(
          step.id,
          isPerfectFlip,
          activeCustomer.pattySide,
        ),
      })
      setBanner(nextCombo >= 5 ? '锦旗进度达成，继续连对！' : '继续制作下一步')
      gameAudio.playCorrect(nextCombo)
      triggerImpact('correct', nextCombo >= 3 ? `Combo x${nextCombo}` : 'HIT!')
      return
    }

    setCombo(0)
    if (activeStep?.word) {
      setMissedWords((currentWords) =>
        currentWords.some((word) => word.id === activeStep.word.id)
          ? currentWords
          : [...currentWords, activeStep.word].slice(-6),
      )
    }
    setScore((currentScore) => Math.max(0, currentScore - wrongPenalty))
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) => {
        if (customer.id !== activeCustomer.id) {
          return customer
        }

        return cookPatty(
          {
            ...customer,
            mistakes: customer.mistakes + 1,
            speech: customer.isBoss
              ? pickLine(bossLines, customer.mistakes + customer.id + 1)
              : pickLine(wrongLines, customer.mistakes + customer.id + 1),
            patience: Math.max(1, customer.patience - 4),
          },
          true,
        )
      }),
    )
    setFeedback({
      kind: 'wrong',
      message: `答错了，正确答案是 ${activeQuestion.correctAnswer}`,
    })
    setBanner(activeCustomer.isBoss ? '教授：这个词根都能错？再快点！' : '医学生更着急了')
    gameAudio.playWrong(activeCustomer.isBoss)
    triggerImpact('wrong', activeCustomer.isBoss ? '教授追问！' : 'MISS!')
  }

  useLayoutEffect(() => {
    answerHandlerRef.current = handleAnswerInternal
  })

  const handleAnswer = useCallback((answer: string) => {
    answerHandlerRef.current(answer)
  }, [])

  const toggleMusic = () => {
    setSettings((currentSettings) => {
      const nextSettings = {
        ...currentSettings,
        musicEnabled: !currentSettings.musicEnabled,
      }

      if (currentSettings.musicEnabled) {
        gameAudio.setEnabled(false)
        gameAudio.stopMusic()
        saveSettings(nextSettings)
        return nextSettings
      }

      gameAudio.setEnabled(true)

      if (gameStatus === 'playing') {
        if (bossSpawned && !bossDefeated) {
          gameAudio.startBossMusic()
        } else {
          gameAudio.startMusic()
        }
      }

      saveSettings(nextSettings)
      return nextSettings
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

  const tutorial = <TutorialModal onClose={() => setShowTutorial(false)} />

  if (view === 'words') {
    return (
      <WordManager
        customWords={customWords}
        onAddWord={handleAddWord}
        onUpdateWord={handleUpdateWord}
        onDeleteWord={handleDeleteWord}
        onImportWords={handleImportWords}
        onClose={closeWordManager}
      />
    )
  }

  if (gameStatus === 'idle') {
    return (
      <StartScreen
        records={records}
        previewRecipes={previewRecipes}
        previewWords={previewWords}
        musicEnabled={musicEnabled}
        showTutorial={showTutorial}
        onStart={startGame}
        onShowTutorial={() => setShowTutorial(true)}
        onCloseTutorial={() => setShowTutorial(false)}
        onOpenWordManager={openWordManager}
        onToggleMusic={toggleMusic}
      />
    )
  }

  if (gameStatus === 'ended') {
    return (
      <ResultScreen
        score={score}
        servedCount={servedCount}
        lostCustomers={lostCustomers}
        bestCombo={bestCombo}
        bossDefeated={bossDefeated}
        finalizedRound={finalizedRound}
        victoryLine={victoryLine}
        records={records}
        serviceRank={serviceRank}
        missedWords={missedWords}
        onStart={startGame}
        onOpenWordManager={openWordManager}
      />
    )
  }

  return (
    <main
      className={`game-shell play-shell ${impact ? `impact-${impact}` : ''} ${
        combo >= 3 ? 'combo-hot' : ''
      } ${bossSpawned && !bossDefeated ? 'boss-mode' : ''} ${
        performanceMode ? 'performance-mode' : ''
      } status-${gameStatus}`}
    >
      <div className="landscape-hint" role="status" aria-live="polite">
        <strong>手机横屏体验更完整</strong>
        <span>请把手机横过来，角色立绘、术语制作台、订单小票和答题区会像游戏机界面一样展开。</span>
      </div>
      {(gameStatus === 'bossFinale' || impact === 'victory') && <BossFinale />}
      {impactText && impact !== 'victory' && (
        <div className={`hit-text hit-${impact}`}>{impactText}</div>
      )}
      <header className="game-header">
        <div className="title-lockup">
          <p className="eyebrow">医学英语词汇学版</p>
          <h1>医学英语汉堡店</h1>
        </div>
        <div className="stats" aria-label="游戏状态">
          <span>得分 {score}</span>
          <span>Combo {combo}</span>
          <span>{goalText}</span>
          <span className={`rank-badge rank-${serviceRank.tier}`}>
            评级 {serviceRank.label}
          </span>
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

      <div className="banner">{banner}</div>
      <div
        className={`rush-meter ${bossSpawned && !bossDefeated ? 'boss-rush' : ''}`}
        aria-label={bossSpawned ? 'Boss 压力进度' : '课堂高峰进度'}
      >
        <span>
          {bossSpawned && !bossDefeated
            ? '教授压力条'
            : `课堂高峰 ${servedCount}/${targetRegularServed}`}
        </span>
        <em>{pressureLabel}</em>
        <strong>{Math.min(100, rushProgress)}%</strong>
        <div className="rush-track" aria-hidden="true">
          <span style={{ width: `${Math.min(100, rushProgress)}%` }} />
        </div>
      </div>

      <div className="shop-layout">
        <CustomerQueue
          customers={customers}
          previewCustomers={queuePreviewCustomers}
          activeCustomerId={activeCustomer?.id}
          handoffCustomer={handoffCustomer}
          transitionState={
            bossSpawned && !bossDefeated
              ? 'bossArrival'
              : gameStatus === 'customerHandoff'
                ? 'handoff'
                : 'active'
          }
          onSelectCustomer={setActiveCustomerId}
        />
        <BurgerStation
          customer={handoffCustomer ?? activeCustomer}
          customers={customers}
          activeCustomerId={activeCustomer?.id}
          onSelectCustomer={setActiveCustomerId}
        />
        <OrderTicket
          customer={handoffCustomer ?? activeCustomer}
          servedCount={servedCount}
          targetServed={targetRegularServed}
          bossSpawned={bossSpawned}
        />
        <QuizPanel
          hasCustomer={gameStatus === 'playing' && Boolean(activeCustomer)}
          question={gameStatus === 'playing' ? activeQuestion : undefined}
          stationText={gameStatus === 'playing' ? activeStep?.stationText : undefined}
          feedback={feedback}
          combo={combo}
          onAnswer={handleAnswer}
        />
      </div>

      {showTutorial && tutorial}
    </main>
  )
}

export default App
