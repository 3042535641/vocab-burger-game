import { getPixelPortraitFrameSrc } from '../utils/portraits'

function BossFinale() {
  const bossFrame = (mood: 'waiting' | 'worried' | 'angry' | 'happy') =>
    getPixelPortraitFrameSrc('boss', true, mood)

  return (
    <div className="boss-finale-scene pixel-boss-finale" aria-live="assertive">
      <div className="finale-speed-lines" aria-hidden="true" />
      <div className="pixel-finale-monitor" aria-hidden="true">
        <span>ROOT OK</span>
        <span>TERM OK</span>
        <span>BONK READY</span>
      </div>

      <div className="pixel-finale-stage">
        <div className="pixel-professor-bust pixel-professor-asset" aria-hidden="true">
          <img className="boss-face-frame face-waiting" src={bossFrame('waiting')} alt="" />
          <img className="boss-face-frame face-worried" src={bossFrame('worried')} alt="" />
          <img className="boss-face-frame face-angry" src={bossFrame('angry')} alt="" />
          <img className="boss-face-frame face-defeated" src={bossFrame('happy')} alt="" />
          <span className="finale-glasses" aria-hidden="true" />
          <span className="pixel-prof-alert" aria-hidden="true">!</span>
          <span className="pixel-prof-note note-left" aria-hidden="true">ROOT!</span>
          <span className="pixel-prof-note note-right" aria-hidden="true">BONK</span>
        </div>

        <div className="pixel-term-card card-a">ROOT</div>
        <div className="pixel-term-card card-b">-ITIS</div>
        <div className="pixel-term-card card-c">Rx PASS</div>
        <div className="pixel-burger-stamp">BURGER BONK</div>
        <div className="finale-subtitle">
          <strong>教授颜艺过载</strong>
          <span>词根、诊断、火候全部通过，医学英语汉堡出餐成功。</span>
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
