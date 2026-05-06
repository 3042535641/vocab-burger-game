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
import WordManager from './components/WordManager'
import {
  comboBonus,
  correctScore,
  maxCustomers,
  targetRegularServed,
  wrongPenalty,
} from './constants/game'
import { words } from './data/words'
import type { WordEntry } from './data/words'
import { useTimedImpact } from './hooks/useTimedImpact'
import type { Customer, Feedback, GameStatus } from './types/game'
import type { GameRecords } from './types/records'
import { gameAudio } from './utils/audio'
import {
  bossLines,
  bossVictoryLines,
  cookPatty,
  correctLines,
  createCustomer,
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
import './App.css'

const categoryLabels: Record<WordEntry['category'], string> = {
  food: '基础医学',
  action: '医学动作',
  shop: '课堂场景',
  feeling: '状态描述',
}

const getServiceRank = (
  score: number,
  bestCombo: number,
  lostCustomers: number,
  bossDefeated: boolean,
) => {
  const penalty = lostCustomers * 80
  const bossBonus = bossDefeated ? 160 : 0
  const rankScore = score + bestCombo * 12 + bossBonus - penalty

  if (rankScore >= 760) {
    return {
      comment: '全班起立，医学英语汉堡之神。',
      label: 'SSS',
      tier: 'sss',
    }
  }

  if (rankScore >= 560) {
    return {
      comment: '术语、熟度、节奏都在线。',
      label: 'S',
      tier: 's',
    }
  }

  if (rankScore >= 390) {
    return {
      comment: '课堂展示很稳，可以继续冲连击。',
      label: 'A',
      tier: 'a',
    }
  }

  if (rankScore >= 240) {
    return {
      comment: '能开店，但还会被教授追问。',
      label: 'B',
      tier: 'b',
    }
  }

  return {
    comment: '建议先看预习词表，再开一局。',
    label: 'C',
    tier: 'c',
  }
}

const normalizeEnglish = (value: string) => value.trim().toLowerCase()

const formatPlayedAt = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '未知时间'
  }

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')

  return `${month}/${day} ${hour}:${minute}`
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
  const [settings, setSettings] = useState(loadSettings)
  const [view, setView] = useState<'game' | 'words'>('game')
  const [customWords, setCustomWords] = useState<WordEntry[]>(loadCustomWords)
  const [records, setRecords] = useState<GameRecords>(loadRecords)
  const [showTutorial, setShowTutorial] = useState(false)
  const [finalizedRound, setFinalizedRound] = useState(false)
  const [victoryLine, setVictoryLine] = useState('')
  const { clearImpact, impact, impactText, triggerImpact } = useTimedImpact()
  const finaleTimerRef = useRef<number | undefined>(undefined)
  const answerHandlerRef = useRef<(answer: string) => void>(() => undefined)
  const musicEnabled = settings.musicEnabled
  const performanceMode = settings.performanceMode
  const wordPool = useMemo(() => [...words, ...customWords], [customWords])
  const previewWords = useMemo(() => {
    return wordPool
      .filter(
        (word, index, list) =>
          list.findIndex((item) => item.english === word.english) === index,
      )
  }, [wordPool])
  const previewRecipes = recipeCatalog

  const activeCustomer =
    customers.find((customer) => customer.id === activeCustomerId) ??
    customers[0]
  const activeQuestionCustomerId = activeCustomer?.id
  const activeQuestionStepIndex = activeCustomer?.stepIndex
  const activeStep =
    activeQuestionStepIndex === undefined
      ? undefined
      : activeCustomer?.steps[activeQuestionStepIndex]
  const activeQuestion = useMemo(() => {
    if (
      activeQuestionCustomerId === undefined ||
      activeQuestionStepIndex === undefined ||
      !activeStep
    ) {
      return undefined
    }

    const options = [activeStep.word.english, ...activeStep.word.wrongOptions]
    const offset = (activeQuestionCustomerId + activeQuestionStepIndex) % options.length

    return {
      chinese: activeStep.word.chinese,
      correctAnswer: activeStep.word.english,
      options: [...options.slice(offset), ...options.slice(0, offset)],
    }
  }, [activeQuestionCustomerId, activeQuestionStepIndex, activeStep])
  const goalText = bossSpawned
    ? bossDefeated
      ? 'Boss 已完成'
      : 'Boss 战进行中'
    : `目标：${servedCount}/${targetRegularServed}`
  const serviceRank = getServiceRank(score, bestCombo, lostCustomers, bossDefeated)
  const rushProgress = bossSpawned
    ? bossDefeated
      ? 100
      : Math.max(12, Math.round(((activeCustomer?.stepIndex ?? 0) / 7) * 100))
    : Math.round((servedCount / targetRegularServed) * 100)

  useEffect(() => {
    return () => {
      window.clearTimeout(finaleTimerRef.current)
      gameAudio.stopMusic()
    }
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
        const result = tickCustomers(currentCustomers)

        if (result.escapedCount > 0) {
          setLostCustomers((count) => count + result.escapedCount)
          setCombo(0)
          setFeedback({
            kind: 'wrong',
            message: result.bossEscaped
              ? '医学英语教授等到爆炸离开了，课堂挑战失败。'
              : '有医学生等太久走了！',
          })
          setBanner(result.bossEscaped ? '教授 Boss 战失败' : '医学生流失，节奏要稳住')

          if (result.bossEscaped) {
            setGameStatus('ended')
            gameAudio.stopMusic()
          }
        }

        setActiveCustomerId((currentActiveId) =>
          result.customers.some((customer) => customer.id === currentActiveId)
            ? currentActiveId
            : result.customers[0]?.id,
        )

        return result.customers
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
        const targetQueueSize = getTargetQueueSize(servedCount)

        if (
          currentCustomers.length >= maxCustomers ||
          currentCustomers.length >= targetQueueSize
        ) {
          return currentCustomers
        }

        const newCustomer = createCustomer(nextCustomerId, false, wordPool)
        setNextCustomerId((id) => id + 1)
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

        return [...currentCustomers, newCustomer]
      })
    }, getRandomDelay(servedCount, customers.length))

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
    const firstCustomer = createCustomer(1, false, wordPool)

    window.clearTimeout(finaleTimerRef.current)
    clearImpact()
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
    setBanner('第一位医学生来了，完成 6 份普通订单后教授 Boss 登场')
  }

  const endGame = () => {
    window.clearTimeout(finaleTimerRef.current)
    clearImpact()
    gameAudio.stopMusic()
    setGameStatus('ended')
    setCustomers([])
    setActiveCustomerId(undefined)
    setBanner('今日营业结束')
  }

  const spawnBoss = (id: number) => {
    const boss = createCustomer(id, true, wordPool)

    gameAudio.stopNormalMusic()
    setBossSpawned(true)
    setNextCustomerId(id + 1)
    setCustomers([boss])
    setActiveCustomerId(boss.id)
    setBanner('医学英语教授 Boss 登场：完成这份终极订单就结算！')
    setFeedback({
      kind: 'info',
      message: '教授订单术语更多，耐心更短，答错会被追问词根。',
    })
    gameAudio.playBoss()

    if (musicEnabled) {
      gameAudio.startBossMusic()
    }
  }

  const finishBurger = (customer: Customer, nextCombo: number) => {
    const { gainedScore, perfectBonus } = scoreBurger(customer)
    const nextServedCount = customer.isBoss ? servedCount : servedCount + 1

    setScore((currentScore) => currentScore + gainedScore)
    setCustomers((currentCustomers) => {
      const nextCustomers = currentCustomers.filter((item) => item.id !== customer.id)
      setActiveCustomerId((currentActiveId) =>
        currentActiveId === customer.id || !currentActiveId
          ? nextCustomers[0]?.id
          : currentActiveId,
      )
      return nextCustomers
    })
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
      setBossDefeated(true)
      setVictoryLine(line)
      setBanner(line)
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

    if (nextServedCount >= targetRegularServed) {
      spawnBoss(nextCustomerId)
      return
    }

    setBanner(
      nextCombo >= 5
        ? '连续答对 5 题，获得医学英语锦旗！'
        : `已完成 ${nextServedCount}/${targetRegularServed}，继续营业`,
    )
  }

  const handleAnswerInternal = (answer: string) => {
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
        pattySide:
          step.id === 'patty'
            ? 'first'
            : step.id === 'flip'
              ? 'second'
              : activeCustomer.pattySide,
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
        message:
          step.id === 'flip'
            ? isPerfectFlip
              ? '完美翻面！熟度刚刚好。'
              : '翻面成功，但熟度不是最佳窗口。'
            : '答对了，动作完成！',
      })
      setBanner(nextCombo >= 5 ? '锦旗进度达成，继续连对！' : '继续制作下一步')
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
        gameAudio.stopMusic()
        saveSettings(nextSettings)
        return nextSettings
      }

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

  const togglePerformanceMode = () => {
    setSettings((currentSettings) => {
      const nextSettings = {
        ...currentSettings,
        performanceMode: !currentSettings.performanceMode,
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

  const historyPanel = (
    <section
      className={`history-panel ${records.history.length === 0 ? 'empty-history' : ''}`}
      aria-labelledby="history-title"
    >
      <div className="section-heading">
        <h2 id="history-title">近期成绩</h2>
        <span>{records.history.length > 0 ? `${records.history.length} 局` : '暂无记录'}</span>
      </div>
      {records.history.length > 0 ? (
        <div className="history-list">
          {records.history.map((round, index) => (
            <article
              className={`history-card ${round.bossDefeated ? 'win' : 'fail'}`}
              key={`${round.playedAt}-${index}`}
            >
              <strong>{round.bossDefeated ? '通关' : '未通关'} · {round.score} 分</strong>
              <span>
                Combo {round.bestCombo} / 出餐 {round.servedCount}
              </span>
              <small>{formatPlayedAt(round.playedAt)}</small>
            </article>
          ))}
        </div>
      ) : (
        <p>完成第一局后会记录最高分、通关次数和最近成绩，课堂汇报时可以直接展示进步轨迹。</p>
      )}
    </section>
  )

  const tutorial = (
    <div
      className="tutorial-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <section className="panel tutorial-panel">
        <p className="eyebrow">医学英语规则速览</p>
        <h2 id="tutorial-title">开店前先看三条</h2>
        <ol>
          <li>
            看中文医学概念选英文术语，答对才会推进汉堡步骤；答错会扣分、扣耐心，还可能把组织肉饼煎焦。
          </li>
          <li>
            组织肉饼第一面 55%-85%、焦度低于 45 时翻面最香，双面控制好可拿 Sterile Perfect Burger。
          </li>
          <li>普通医学生约 20 秒开始着急，完成 6 份后医学英语教授 Boss 登场。</li>
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
        onUpdateWord={handleUpdateWord}
        onDeleteWord={handleDeleteWord}
        onImportWords={handleImportWords}
        onClose={closeWordManager}
      />
    )
  }

  if (gameStatus === 'idle') {
    return (
      <main className="game-shell start-screen">
        <section
          className="panel intro-panel start-dashboard"
          aria-labelledby="game-title"
        >
          <div className="intro-hero">
            <div>
              <p className="eyebrow">Medical Vocab Burger Shop</p>
              <h1 id="game-title">医学英语汉堡店</h1>
              <p>
                医学生会随机排队点餐。先看本局医学英语术语，再看中文概念选英文，
                答对才能完成汉堡动作；答错会扣分、掉耐心，还可能把组织肉饼煎焦。
              </p>
            </div>
            <div className="start-mascot" aria-hidden="true">
              <span>医学词</span>
            </div>
          </div>

          <div className="record-strip" aria-label="历史记录">
            <span>最高分 {records.highScore}</span>
            <span>最佳 Combo {records.bestCombo}</span>
            <span>
              通关 {records.wins}/{records.rounds}
            </span>
          </div>

          {historyPanel}

          <section className="recipe-preview" aria-labelledby="recipe-preview-title">
            <div className="section-heading">
              <h2 id="recipe-preview-title">本局医学汉堡配方</h2>
              <span>随机出单</span>
            </div>
            <div className="recipe-preview-grid">
              {previewRecipes.map((recipe) => (
                <article
                  className={`recipe-preview-card recipe-${recipe.id}`}
                  key={recipe.id}
                >
                  <strong>{recipe.name}</strong>
                  <span>{recipe.tag}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="word-preview" aria-labelledby="preview-title">
            <div className="section-heading">
              <h2 id="preview-title">本局医学术语预习</h2>
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
                  {word.note && <em>{word.note}</em>}
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
      <main
        className={`game-shell start-screen ${bossDefeated ? 'victory-result' : ''}`}
      >
        <section className="panel intro-panel result-panel" aria-labelledby="result-title">
          <p className="eyebrow">{bossDefeated ? '教授破防结算' : '营业结算'}</p>
          <h1 id="result-title">今日得分：{score}</h1>
          <p>
            完成 {servedCount} 份普通医学汉堡，流失 {lostCustomers} 位医学生，最高连对{' '}
            {bestCombo} 题。
          </p>
          <p>
            {bossDefeated
              ? victoryLine || '教授 Boss 已完成，适合医学英语课堂展示收尾。'
              : '教授 Boss 未完成，可以再开一局。'}
          </p>
          <p className={`result-rank rank-${serviceRank.tier}`}>
            本局评级：{serviceRank.label} · {serviceRank.comment}
          </p>
          <div className="record-strip" aria-label="历史记录">
            <span>历史最高 {Math.max(records.highScore, score)}</span>
            <span>历史 Combo {Math.max(records.bestCombo, bestCombo)}</span>
            <span>
              通关次数 {records.wins + (finalizedRound ? 0 : bossDefeated ? 1 : 0)}
            </span>
          </div>
          {historyPanel}
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
      } ${bossSpawned && !bossDefeated ? 'boss-mode' : ''} ${
        performanceMode ? 'performance-mode' : ''
      }`}
    >
      {impact === 'victory' && <BossFinale />}
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
            onClick={togglePerformanceMode}
          >
            {performanceMode ? '性能模式' : '特效开'}
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

      <section className="shop-scene compact-scene" aria-label="医学英语汉堡店场景">
        <div className="shop-sign">MED VOCAB BURGER</div>
        <div className="awning" aria-hidden="true" />
        <div className="counter-rail" aria-hidden="true" />
      </section>

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
        <strong>{Math.min(100, rushProgress)}%</strong>
        <div className="rush-track" aria-hidden="true">
          <span style={{ width: `${Math.min(100, rushProgress)}%` }} />
        </div>
      </div>

      <div className="shop-layout">
        <CustomerQueue
          customers={customers}
          activeCustomerId={activeCustomer?.id}
          onSelectCustomer={setActiveCustomerId}
        />
        <BurgerStation
          customer={activeCustomer}
          customers={customers}
          activeCustomerId={activeCustomer?.id}
          onSelectCustomer={setActiveCustomerId}
        />
        <OrderTicket
          customer={activeCustomer}
          servedCount={servedCount}
          targetServed={targetRegularServed}
          bossSpawned={bossSpawned}
        />
      </div>

      <QuizPanel
        hasCustomer={Boolean(activeCustomer)}
        question={activeQuestion}
        stationText={activeStep?.stationText}
        feedback={feedback}
        combo={combo}
        onAnswer={handleAnswer}
      />
      {showTutorial && tutorial}
    </main>
  )
}

export default App
