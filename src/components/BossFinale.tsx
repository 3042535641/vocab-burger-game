import { useEffect, useState } from 'react'
import { bossFinaleBeats } from '../data/characters'
import { getBossFinaleFrameSrc } from '../utils/portraits'

function BossFinale() {
  const [beatIndex, setBeatIndex] = useState(0)
  const beat = bossFinaleBeats[beatIndex]

  useEffect(() => {
    const timers = bossFinaleBeats.slice(1).map((nextBeat, index) =>
      window.setTimeout(() => setBeatIndex(index + 1), nextBeat.startMs),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  return (
    <div
      className={`boss-finale-scene vn-finale finale-${beat.impact}`}
      aria-live="assertive"
    >
      <div className="vn-finale-speedlines" aria-hidden="true" />
      <div className="vn-finale-flash" aria-hidden="true" />
      <div className="vn-finale-stage">
        <img
          className="vn-boss-frame"
          key={beat.frame}
          src={getBossFinaleFrameSrc(beat.frame)}
          alt=""
        />
        {beat.callout && (
          <strong className="vn-finale-callout" key={beat.callout}>
            {beat.callout}
          </strong>
        )}
        {beat.impact === 'bonk' && <span className="vn-bonk-mark">BONK!</span>}
        {beat.impact === 'finish' && (
          <div className="vn-finale-result">
            <strong>教授彻底破防</strong>
            <span>医学术语汉堡，判定通过！</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default BossFinale
