import { memo, type CSSProperties } from 'react'
import { maxCustomers } from '../constants/game'
import type { Customer, Mood } from '../types/game'
import {
  getCustomerMood,
  getUrgencyLabel,
  getWaitedSeconds,
} from '../utils/gameLogic'
import { getPixelPortraitFrameSrc } from '../utils/portraits'

type CustomerQueueProps = {
  customers: Customer[]
  activeCustomerId?: number
  handoffCustomer?: Customer
  onSelectCustomer: (id: number) => void
}

const moodLabels: Record<Mood, string> = {
  happy: '刚到店',
  waiting: '开始催单',
  worried: '20 秒着急',
  angry: '红温背词',
}

const avatarLabels: Record<string, string> = {
  boss: '查词教授',
  bow: '护理秒表派',
  bun: '实验报告控',
  cap: '解剖图谱党',
  round: '早八续命派',
  shade: '药理红温派',
  star: '词根女王',
}

const avatarMoodLines: Record<string, Record<Mood, string>> = {
  boss: {
    happy: '镜片反光，开始抽查',
    waiting: '教案轻拍桌面',
    worried: '术语卡飞出来了',
    angry: '教授颜艺预警',
  },
  bow: {
    happy: '秒表和汉堡都很准',
    waiting: '交班前开始倒计时',
    worried: '护理铃疯狂摇摆',
    angry: '病区红温警报',
  },
  bun: {
    happy: '实验数据暂时正常',
    waiting: '报告夹开始冒烟',
    worried: '护目镜反光加重',
    angry: '离心机式破防',
  },
  cap: {
    happy: '骨骼卡片稳稳拿捏',
    waiting: '解剖图谱翻页加速',
    worried: '颅骨知识过载',
    angry: '肋骨式吐槽爆发',
  },
  round: {
    happy: '咖啡回血成功',
    waiting: '早八灵魂加载中',
    worried: '晨会前脑内报警',
    angry: '早八式破防',
  },
  shade: {
    happy: '剂量刚刚好',
    waiting: '药片开始弹跳',
    worried: '副作用预警',
    angry: '药理火山爆发',
  },
  star: {
    happy: '词根女王微笑营业',
    waiting: '小票准备开麦',
    worried: '发夹闪烁警报',
    angry: '错题斩击准备',
  },
}

function CustomerPortrait({
  avatar,
  isBoss,
  mood,
  handoff,
}: {
  avatar: Customer['avatar']
  isBoss: boolean
  mood: Mood
  handoff: boolean
}) {
  const avatarKey = isBoss ? 'boss' : avatar || 'round'
  const portraitStyle = {
    '--portrait-src': `url("${getPixelPortraitFrameSrc(avatar, isBoss, mood)}")`,
  } as CSSProperties

  return (
    <div
      className={`portrait-stage pixel-portrait portrait-frame-mode portrait-${avatarKey} mood-${mood} ${
        handoff ? 'portrait-satisfied' : ''
      }`}
      style={portraitStyle}
    >
      <span className="pixel-portrait-sheet" aria-hidden="true" />
      <span className="pixel-portrait-scanline" aria-hidden="true" />
      <span className="portrait-character-tag">
        {isBoss ? 'PROFESSOR BOSS' : 'MED STUDENT CUSTOMER'}
      </span>
      <span className="portrait-role-badge">{avatarLabels[avatarKey]}</span>
      <span className="portrait-reaction-mark" aria-hidden="true" />
      <span className="portrait-mood-effect" aria-hidden="true" />
      <span className="portrait-expression">
        {handoff ? '满足退场' : avatarMoodLines[avatarKey]?.[mood] ?? moodLabels[mood]}
      </span>
    </div>
  )
}

function CustomerQueue({
  customers,
  activeCustomerId,
  handoffCustomer,
  onSelectCustomer,
}: CustomerQueueProps) {
  const activeCustomer =
    customers.find((customer) => customer.id === activeCustomerId) ?? customers[0]
  const displayCustomer = handoffCustomer ?? activeCustomer
  const handoff = Boolean(handoffCustomer)

  if (!displayCustomer) {
    return (
      <section className="panel customer-line character-stage-panel empty">
        <div className="character-stage empty-stage">
          <div className="character-dialogue">
            <small>MEDICAL ENGLISH LIVE</small>
            <strong>下一位医学生正在赶来</strong>
            <p>术语台已经预热，下一张顾客卡马上翻入画面。</p>
          </div>
        </div>
      </section>
    )
  }

  const mood = handoff ? 'happy' : getCustomerMood(displayCustomer)
  const patienceRatio = Math.max(
    0,
    Math.round((displayCustomer.patience / displayCustomer.maxPatience) * 100),
  )
  const waitedSeconds = getWaitedSeconds(displayCustomer)
  const urgencyLabel = handoff ? '满意退场' : getUrgencyLabel(displayCustomer)

  return (
    <section
      className={`panel customer-line character-stage-panel mood-${mood} ${
        displayCustomer.isBoss ? 'boss-stage' : ''
      } ${handoff ? 'handoff-satisfied' : ''}`}
      aria-label="当前医学生角色舞台"
    >
      <div className="section-heading compact-heading">
        <h2>{displayCustomer.isBoss ? '教授压场' : '医学生点单'}</h2>
        <span>
          {Math.max(customers.length, handoff ? 1 : 0)}/{maxCustomers}
        </span>
      </div>

      <div className="character-stage">
        <div className="character-portrait-wrap">
          <CustomerPortrait
            avatar={displayCustomer.avatar}
            isBoss={displayCustomer.isBoss}
            mood={mood}
            handoff={handoff}
          />
          <span className={`character-mood mood-${mood}`}>
            {handoff ? '吃到汉堡' : moodLabels[mood]}
          </span>
        </div>

        <div className="character-dialogue">
          <small>{displayCustomer.isBoss ? 'PROFESSOR BOSS' : 'MED STUDENT'}</small>
          <strong>{displayCustomer.name}</strong>
          <p>{displayCustomer.speech}</p>
          <em>
            {urgencyLabel} · 等待 {waitedSeconds}s · {displayCustomer.recipe.name}
          </em>
        </div>

        <div className="stage-patience" aria-label={`耐心 ${patienceRatio}%`}>
          <span style={{ width: `${patienceRatio}%` }} />
        </div>
      </div>

      {!handoff && customers.length > 1 && (
        <div className="queue-chips" aria-label="切换排队医学生">
          {customers.map((customer) => {
            const chipMood = getCustomerMood(customer)
            return (
              <button
                type="button"
                className={`queue-chip ${chipMood} ${
                  customer.id === activeCustomer?.id ? 'active' : ''
                }`}
                key={customer.id}
                onClick={() => onSelectCustomer(customer.id)}
              >
                <span>{customer.isBoss ? 'BOSS' : customer.name.slice(0, 2)}</span>
                <small>{getWaitedSeconds(customer)}s</small>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default memo(CustomerQueue)
