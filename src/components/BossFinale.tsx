import type { CSSProperties } from 'react'
import { getPixelPortraitSrc } from '../utils/portraits'

function BossFinale() {
  const bossPortraitStyle = {
    '--boss-final-src': `url("${getPixelPortraitSrc('boss', true)}")`,
  } as CSSProperties

  return (
    <div className="boss-finale-scene pixel-boss-finale" aria-live="assertive">
      <div className="pixel-finale-backdrop" aria-hidden="true" />
      <div className="pixel-finale-monitor" aria-hidden="true">
        <span>TERM CHECK</span>
        <span>DIAGNOSIS OK</span>
        <span>BURGER PASS</span>
      </div>
      <div className="pixel-finale-stage" aria-hidden="true">
        <div className="pixel-professor-bust pixel-professor-asset" style={bossPortraitStyle}>
          <span className="finale-pixel-sheet" />
          <span className="finale-pixel-scanline" />
          <span className="pixel-prof-alert">!</span>
          <span className="pixel-prof-note note-left">STAT!</span>
          <span className="pixel-prof-note note-right">BONK</span>
        </div>
        <div className="pixel-finale-dialogue">
          <small>FINAL ROUND CONSULTATION</small>
          <strong>教授瞳孔地震：术语抢救成功</strong>
          <p>词根、诊断、火候全部合格。医学英语夜班汉堡店宣布下课！</p>
        </div>
        <div className="pixel-term-card card-a">ROOT</div>
        <div className="pixel-term-card card-b">-ITIS</div>
        <div className="pixel-term-card card-c">Rx PASS</div>
        <div className="pixel-burger-stamp">BONK</div>
        <div className="finale-expression-bursts" aria-hidden="true">
          <span className="burst-a">ROOT!</span>
          <span className="burst-b">BUN!</span>
          <span className="burst-c">PASS!</span>
        </div>
        <div className="finale-burger-bonk" aria-hidden="true">
          <span className="bonk-bun top" />
          <span className="bonk-cheese" />
          <span className="bonk-patty" />
          <span className="bonk-bun bottom" />
        </div>
      </div>
    </div>
  )
}

export default BossFinale
