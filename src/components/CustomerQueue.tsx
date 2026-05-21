import { memo, type CSSProperties } from 'react'
import { maxCustomers } from '../constants/game'
import type { Customer, Mood } from '../types/game'
import {
  getCustomerMood,
  getUrgencyLabel,
  getWaitedSeconds,
} from '../utils/gameLogic'
import { getPixelPortraitFrameSrc } from '../utils/portraits'

const moodLabels: Record<Mood, string> = {
  happy: '淡定背词',
  waiting: '开始催单',
  worried: '红温预警',
  angry: '词根破防',
}

type CustomerQueueProps = {
  customers: Customer[]
  activeCustomerId?: number
  onSelectCustomer: (id: number) => void
}

const expressionLabels: Record<Mood, string> = {
  happy: '背词稳住',
  waiting: '开始催单',
  worried: '瞳孔地震',
  angry: '红温查词',
}

const avatarLabels: Record<string, string> = {
  boss: '教授威压',
  bow: '护理时钟',
  bun: '实验报告',
  cap: '解剖图谱',
  round: '早八续命',
  shade: '药理红温',
  star: '词根女王',
}

const avatarMoodLabels: Record<string, Record<Mood, string>> = {
  boss: {
    happy: '金丝眼镜冷笑',
    waiting: '查房压迫感',
    worried: '教案开始冒汗',
    angry: '教授颜艺崩坏',
  },
  bow: {
    happy: '护理表格全对',
    waiting: '秒表开始滴答',
    worried: '交班前瞳孔震',
    angry: '护理铃暴走',
  },
  bun: {
    happy: '实验报告稳住',
    waiting: '数据开始发抖',
    worried: '护目镜起雾',
    angry: '离心机红温',
  },
  cap: {
    happy: '解剖图谱冷静',
    waiting: '骨骼卡片乱飞',
    worried: '颅骨知识过载',
    angry: '肋骨式吐槽',
  },
  round: {
    happy: '早八灵魂回归',
    waiting: '咖啡因续命',
    worried: '晨会脑内报警',
    angry: '早八破防',
  },
  shade: {
    happy: '药理剂量刚好',
    waiting: '药片开始弹跳',
    worried: '副作用预警',
    angry: '药理火山爆发',
  },
  star: {
    happy: '词根女王微笑',
    waiting: '小票准备开麦',
    worried: '发夹警报闪烁',
    angry: '词缀怒斩错题',
  },
}

function CustomerPortrait({
  avatar,
  isBoss,
  mood,
}: {
  avatar: Customer['avatar']
  isBoss: boolean
  mood: Mood
}) {
  const avatarKey = isBoss ? 'boss' : avatar ?? 'round'
  const avatarLabel = avatarLabels[avatarKey] ?? avatarLabels.round
  const expressionLabel =
    avatarMoodLabels[avatarKey]?.[mood] ?? expressionLabels[mood]
  const portraitStyle = {
    '--portrait-src': `url("${getPixelPortraitFrameSrc(avatar, isBoss, mood)}")`,
  } as CSSProperties

  return (
    <div
      className={`portrait-stage pixel-portrait portrait-frame-mode portrait-${avatar} mood-${mood}`}
      style={portraitStyle}
    >
      <span className="pixel-portrait-sheet" aria-hidden="true" />
      <span className="pixel-portrait-scanline" aria-hidden="true" />
      <span className="portrait-character-tag">
        {isBoss ? 'PROFESSOR CUSTOMER' : 'MED STUDENT CUSTOMER'}
      </span>
      <span className="portrait-role-badge">{avatarLabel}</span>
      <span className="portrait-reaction-mark" aria-hidden="true" />
      <span className="portrait-mood-effect" aria-hidden="true" />
      <span className="portrait-expression">{expressionLabel}</span>
    </div>
  )
}

function CustomerQueue({
  customers,
  activeCustomerId,
  onSelectCustomer,
}: CustomerQueueProps) {
  const activeCustomer =
    customers.find((customer) => customer.id === activeCustomerId) ?? customers[0]

  if (!activeCustomer) {
    return (
      <section className="panel customer-line character-stage-panel empty">
        <div className="section-heading">
          <h2>医学生候场</h2>
          <span>0/{maxCustomers}</span>
        </div>
        <div className="character-stage empty-stage">
          <div className="character-dialogue">
            <small>MEDICAL ENGLISH LIVE</small>
            <strong>暂时无人点单</strong>
            <p>术语台词本已就位，下一位医学生正在赶来。</p>
          </div>
        </div>
      </section>
    )
  }

  const mood = getCustomerMood(activeCustomer)
  const patienceRatio = Math.max(
    0,
    Math.round((activeCustomer.patience / activeCustomer.maxPatience) * 100),
  )
  const waitedSeconds = getWaitedSeconds(activeCustomer)
  const urgencyLabel = getUrgencyLabel(activeCustomer)

  return (
    <section
      className={`panel customer-line character-stage-panel mood-${mood} ${
        activeCustomer.isBoss ? 'boss-stage' : ''
      }`}
      aria-label="当前医学生角色舞台"
    >
      <div className="section-heading compact-heading">
        <h2>{activeCustomer.isBoss ? '教授压场' : '今日主角'}</h2>
        <span>
          {customers.length}/{maxCustomers}
        </span>
      </div>

      <div className="character-stage">
        <div className="character-portrait-wrap">
          <CustomerPortrait
            avatar={activeCustomer.avatar}
            isBoss={activeCustomer.isBoss}
            mood={mood}
          />
          <span className={`character-mood mood-${mood}`}>
            {moodLabels[mood]}
          </span>
        </div>

        <div className="character-dialogue">
          <small>{activeCustomer.isBoss ? 'PROFESSOR BOSS' : 'MED STUDENT'}</small>
          <strong>{activeCustomer.name}</strong>
          <p>{activeCustomer.speech}</p>
          <em>
            {urgencyLabel} · 等待 {waitedSeconds}s · {activeCustomer.recipe.name}
          </em>
        </div>

        <div className="stage-patience" aria-label={`耐心 ${patienceRatio}%`}>
          <span style={{ width: `${patienceRatio}%` }} />
        </div>
      </div>

      {customers.length > 1 && (
        <div className="queue-chips" aria-label="切换排队医学生">
          {customers.map((customer) => {
            const chipMood = getCustomerMood(customer)
            return (
              <button
                type="button"
                className={`queue-chip ${chipMood} ${
                  customer.id === activeCustomer.id ? 'active' : ''
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
