import { memo } from 'react'
import { maxCustomers } from '../constants/game'
import type { Customer, Mood } from '../types/game'
import {
  getCustomerMood,
  getUrgencyLabel,
  getWaitedSeconds,
} from '../utils/gameLogic'
import { getPortraitHref } from '../utils/portraits'

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

function CustomerPortrait({
  avatar,
  isBoss,
  mood,
}: {
  avatar: Customer['avatar']
  isBoss: boolean
  mood: Mood
}) {
  return (
    <div className={`portrait-stage portrait-${avatar} mood-${mood}`}>
      <svg className="portrait-art" viewBox="0 0 260 360" aria-hidden="true">
        <use href={getPortraitHref(avatar, isBoss)} />
      </svg>
      <span className="vn-bust" aria-hidden="true">
        <span className="vn-hair-back" />
        <span className="vn-shoulders" />
        <span className="vn-neck" />
        <span className="vn-face">
          <span className="vn-ear ear-left" />
          <span className="vn-ear ear-right" />
          <span className="vn-bang bang-left" />
          <span className="vn-bang bang-mid" />
          <span className="vn-bang bang-right" />
          <span className="vn-brow brow-left" />
          <span className="vn-brow brow-right" />
          <span className="vn-eye eye-left">
            <span />
          </span>
          <span className="vn-eye eye-right">
            <span />
          </span>
          <span className="vn-nose" />
          <span className="vn-mouth" />
          <span className="vn-blush blush-left" />
          <span className="vn-blush blush-right" />
          <span className="vn-sweat" />
          <span className="vn-vein" />
        </span>
        <span className="vn-accessory" />
      </span>
      <span className="portrait-face-mask" />
      <span className="portrait-brow-pop brow-left" />
      <span className="portrait-brow-pop brow-right" />
      <span className="portrait-eye-pop eye-left" />
      <span className="portrait-eye-pop eye-right" />
      <span className="portrait-mouth-pop" />
      <span className="portrait-sweat-drop" />
      <span className="portrait-vein" />
      <span className="portrait-med-chip">MED</span>
      <span className="portrait-expression">{expressionLabels[mood]}</span>
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
