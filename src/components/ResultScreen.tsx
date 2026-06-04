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
            <span>
              {bossDefeated
                ? '教授 Boss 已破防，课堂汇报效果拉满。'
                : 'Boss 还没打完，下一局可以继续冲。'}
            </span>
            <span>错题复盘：{missedWords.length} 个术语，右侧可滚动查看。</span>
            <span>普通角色轮换：每局按 6 位医学生顺序出场。</span>
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
