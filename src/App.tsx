import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import BurgerStation from './components/BurgerStation'
import CustomerQueue from './components/CustomerQueue'
import OrderTicket from './components/OrderTicket'
import QuizPanel from './components/QuizPanel'
import WordManager from './components/WordManager'
import {
  bossStepWordIds,
  comboBonus,
  correctScore,
  maxCustomers,
  stepWordIds,
  targetRegularServed,
  wrongPenalty,
} from './constants/game'
import { words } from './data/words'
import type { WordEntry } from './data/words'
import { useTimedImpact } from './hooks/useTimedImpact'
import type {
  Customer,
  Feedback,
  GameStatus,
} from './types/game'
import type { GameRecords } from './types/records'
import { gameAudio } from './utils/audio'
import {
  bossLines,
  bossVictoryLines,
  cookPatty,
  correctLines,
  createCustomer,
  getRandomDelay,
  getWaitingLine,
  pickLine,
  wrongLines,
} from './utils/gameLogic'
import {
  loadCustomWords,
  loadRecords,
  saveCustomWords,
  saveRecords,
} from './utils/storage'
import './App.css'

const categoryLabels: Record<WordEntry['category'], string> = {
  food: '食材',
  action: '动作',
  shop: '店铺',
  feeling: '情绪',
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
  const { clearImpact, impact, impactText, triggerImpact } = useTimedImpact()
  const finaleTimerRef = useRef<number | undefined>(undefined)
  const answerHandlerRef = useRef<(answer: string) => void>(() => undefined)
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
  const activeQuestionCustomerId = activeCustomer?.id
  const activeQuestionStepIndex = activeCustomer?.stepIndex
  const activeStep =
    activeQuestionStepIndex === undefined
      ? undefined
      : activeCustomer?.steps[activeQuestionStepIndex]
  const activeQuestion = useMemo(
    () => {
      if (
        activeQuestionCustomerId === undefined ||
        activeQuestionStepIndex === undefined ||
        !activeStep
      ) {
        return undefined
      }

      const options = [activeStep.word.english, ...activeStep.word.wrongOptions]
      const offset =
        (activeQuestionCustomerId + activeQuestionStepIndex) % options.length

      return {
        chinese: activeStep.word.chinese,
        correctAnswer: activeStep.word.english,
        options: [...options.slice(offset), ...options.slice(0, offset)],
      }
    },
    [activeQuestionCustomerId, activeQuestionStepIndex, activeStep],
  )
  const activeStationText = activeStep?.stationText
  const goalText = bossSpawned
    ? bossDefeated
      ? 'Boss 已完成'
      : 'Boss 战进行中'
    : `目标：${servedCount}/${targetRegularServed}`

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
        const remainingCustomers: Customer[] = []
        let escapedCount = 0
        let bossEscaped = false

        for (const customer of currentCustomers) {
          const nextPatience = customer.patience - 1

          if (nextPatience <= 0) {
            escapedCount += 1
            bossEscaped = bossEscaped || customer.isBoss
            continue
          }

          const nextCustomer = cookPatty({
            ...customer,
            patience: nextPatience,
          })

          remainingCustomers.push({
            ...nextCustomer,
            speech: getWaitingLine(nextCustomer),
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

  const handleUpdateWord = (word: WordEntry) => {
    const exists = wordPool.some(
      (item) =>
        item.id !== word.id &&
        item.english.toLowerCase() === word.english.toLowerCase(),
    )

    if (exists) {
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
      [...words, ...customWords].map((word) =>
        word.english.trim().toLowerCase(),
      ),
    )
    const nextWords = [...customWords]
    let addedCount = 0

    for (const word of importedWords) {
      const normalizedEnglish = word.english.trim().toLowerCase()

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
    setBanner('第一位顾客来了，完成 6 份普通订单后 Boss 登场')
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
      customer.firstSideDoneness >= 55 &&
      customer.firstSideDoneness <= 85 &&
      customer.secondSideDoneness >= 35 &&
      customer.secondSideDoneness <= 90
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
      window.clearTimeout(finaleTimerRef.current)
      setBossDefeated(true)
      setVictoryLine(line)
      setBanner(line)
      gameAudio.playVictory()
      triggerImpact('victory', 'Boss 破防！')
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
        ? '连续答对 5 题，获得课堂锦旗！'
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
        step.id === 'flip' &&
        activeCustomer.firstSideDoneness >= 55 &&
        activeCustomer.firstSideDoneness <= 85 &&
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
        pattySide:
          step.id === 'patty'
            ? 'first'
            : step.id === 'flip'
              ? 'second'
              : activeCustomer.pattySide,
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

        return cookPatty({
          ...customer,
          mistakes: customer.mistakes + 1,
          speech: customer.isBoss
            ? pickLine(bossLines, customer.mistakes + customer.id + 1)
            : pickLine(wrongLines, customer.mistakes + customer.id + 1),
          patience: Math.max(1, customer.patience - 4),
        }, true)
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

  useLayoutEffect(() => {
    answerHandlerRef.current = handleAnswerInternal
  })

  const handleAnswer = useCallback((answer: string) => {
    answerHandlerRef.current(answer)
  }, [])

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
        <div className="boss-finale-scene" aria-live="assertive">
          <div className="boss-finale-lights" aria-hidden="true" />
          <div className="boss-finale-stage" aria-hidden="true">
            <div className="boss-finale-table" />
            <div className="boss-finale-boss">
              <span className="finale-eye finale-eye-left" />
              <span className="finale-eye finale-eye-right" />
              <span className="finale-brow finale-brow-left" />
              <span className="finale-brow finale-brow-right" />
              <span className="finale-cheek finale-cheek-left" />
              <span className="finale-cheek finale-cheek-right" />
              <span className="finale-mouth" />
              <span className="finale-sweat finale-sweat-left" />
              <span className="finale-sweat finale-sweat-right" />
              <span className="finale-smoke finale-smoke-one" />
              <span className="finale-smoke finale-smoke-two" />
              <span className="finale-vein" />
            </div>
            <div className="boss-finale-burger" />
            <div className="boss-finale-stars">
              <span />
              <span />
              <span />
            </div>
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
        stationText={activeStationText}
        feedback={feedback}
        combo={combo}
        onAnswer={handleAnswer}
      />
      {showTutorial && tutorial}
    </main>
  )
}

export default App
