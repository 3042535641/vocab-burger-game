import { memo } from 'react'
import type { WordEntry } from '../data/words'

type MissedReviewPanelProps = {
  words: WordEntry[]
}

function MissedReviewPanel({ words }: MissedReviewPanelProps) {
  if (words.length === 0) {
    return null
  }

  return (
    <section className="missed-review" aria-labelledby="missed-review-title">
      <div className="section-heading">
        <h2 id="missed-review-title">本局错题复盘</h2>
        <span>{words.length} 个术语</span>
      </div>
      <div className="missed-list">
        {words.map((word) => (
          <article className="missed-card" key={word.id}>
            <strong>{word.chinese}</strong>
            <span>{word.english}</span>
            {word.note && <small>{word.note}</small>}
          </article>
        ))}
      </div>
    </section>
  )
}

export default memo(MissedReviewPanel)
