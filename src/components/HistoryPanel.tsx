import { memo } from 'react'
import type { GameRecords } from '../types/records'
import { formatPlayedAt } from '../utils/display'

type HistoryPanelProps = {
  records: GameRecords
}

function HistoryPanel({ records }: HistoryPanelProps) {
  return (
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
}

export default memo(HistoryPanel)
