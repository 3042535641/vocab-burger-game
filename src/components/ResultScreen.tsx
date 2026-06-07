import { memo } from 'react'
import type { WordEntry } from '../data/words'
import type { GameRecords } from '../types/records'
import HistoryPanel from './HistoryPanel'
import MissedReviewPanel from './MissedReviewPanel'

type ResultRank = {
  comment: string
  label: string
  tier: string
}

type ResultScreenProps = {
  score: number
  servedCount: number
  lostCustomers: number
  bestCombo: number
  bossDefeated: boolean
  finalizedRound: boolean
  victoryLine: string
  records: GameRecords
  serviceRank: ResultRank
  missedWords: WordEntry[]
  onStart: () => void
  onOpenWordManager: () => void
}

function ResultScreen({
  score,
  servedCount,
  lostCustomers,
  bestCombo,
  bossDefeated,
  finalizedRound,
  victoryLine,
  records,
  serviceRank,
  missedWords,
  onStart,
  onOpenWordManager,
}: ResultScreenProps) {
  const nextWins = records.wins + (finalizedRound ? 0 : bossDefeated ? 1 : 0)
  const recapLines = [
    bossDefeated
      ? '教授已破防：眼镜飞了，词根跪了，汉堡被迫盖章通过。'
      : servedCount >= 6
        ? 'Boss 还在门口冷笑：普通单清完了，教授查房差临门一堡。'
        : '本局像急诊夜班：汉堡在冒烟，词根在排队，医学生在撤退。',
    missedWords.length === 0
      ? '错题复盘：0 个术语，今晚大脑像刚消毒的手术台一样干净。'
      : `错题复盘：${missedWords.length} 个术语正在右侧挂号，建议立刻安排词根会诊。`,
    bestCombo >= 20
      ? `连击报告：Combo ${bestCombo}，这不是答题，这是医学英语心电图起飞。`
      : bestCombo >= 8
        ? `连击报告：Combo ${bestCombo}，词根已经开始自觉排队，教授的血压也跟着押韵。`
        : '课堂播报：汉堡还热，词根还倔，下一局建议先给大脑来杯无菌奶茶。',
  ]

  return (
    <main
      className={`game-shell start-screen pixel-result ${bossDefeated ? 'victory-result' : ''}`}
    >
      <section className="panel intro-panel result-panel" aria-labelledby="result-title">
        <div className="result-summary-card">
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
            <span>通关次数 {nextWins}</span>
          </div>
          <div className="result-actions">
            <button type="button" className="primary-action" onClick={onStart}>
              再开一局
            </button>
            <button
              type="button"
              className="small-action manager-shortcut"
              onClick={onOpenWordManager}
            >
              管理词库
            </button>
          </div>
          <div className="result-recap-card" aria-label="本局回顾">
            <strong>本局回顾</strong>
            {recapLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </div>
        <div className="result-review-card">
          <MissedReviewPanel words={missedWords} />
          <HistoryPanel records={records} />
        </div>
      </section>
    </main>
  )
}

export default memo(ResultScreen)
