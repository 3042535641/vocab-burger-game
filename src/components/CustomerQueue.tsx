import { memo } from 'react'
import { maxCustomers } from '../constants/game'
import type { Customer, Mood } from '../types/game'
import {
  getCustomerMood,
  getUrgencyLabel,
  getWaitedSeconds,
} from '../utils/gameLogic'

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

function CustomerFace({
  avatar,
  isBoss,
  mood,
  stage = false,
}: {
  avatar: Customer['avatar']
  isBoss: boolean
  mood: Mood
  stage?: boolean
}) {
  return (
    <span
      className={`customer-avatar ${stage ? 'stage-avatar' : ''} avatar-${avatar} face-${mood} ${
        isBoss ? 'face-boss' : ''
      }`}
      aria-hidden="true"
    >
      <span className="face-hair" />
      <span className="face-brow face-brow-left" />
      <span className="face-brow face-brow-right" />
      <span className="face-eye face-eye-left" />
      <span className="face-eye face-eye-right" />
      <span className="face-mouth" />
      <span className="face-sweat" />
      <span className="face-blush face-blush-left" />
      <span className="face-blush face-blush-right" />
      <span className="face-fever" />
      {isBoss && <span className="face-title">教授</span>}
    </span>
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
          <CustomerFace
            avatar={activeCustomer.avatar}
            isBoss={activeCustomer.isBoss}
            mood={mood}
            stage
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
