import { memo, type CSSProperties } from 'react'
import type {
  Customer,
  QueuePreviewCustomer,
  QueueTransitionState,
} from '../types/game'
import {
  getCustomerMood,
  getUrgencyLabel,
  getWaitedSeconds,
} from '../utils/gameLogic'
import {
  getCharacterProfile,
  getPortraitFrameKey,
  getStagePortraitFrameSrc,
} from '../utils/portraits'

type CustomerQueueProps = {
  customers: Customer[]
  previewCustomers?: QueuePreviewCustomer[]
  activeCustomerId?: number
  handoffCustomer?: Customer
  transitionState?: QueueTransitionState
  onSelectCustomer: (id: number) => void
}

function CustomerQueue({
  customers,
  previewCustomers = [],
  activeCustomerId,
  handoffCustomer,
  transitionState = 'active',
  onSelectCustomer,
}: CustomerQueueProps) {
  const activeCustomer =
    customers.find((customer) => customer.id === activeCustomerId) ?? customers[0]
  const displayCustomer = handoffCustomer ?? activeCustomer
  const isHandoff = Boolean(handoffCustomer)

  if (!displayCustomer) {
    return (
      <section className="character-stage-panel vn-character-stage empty">
        {previewCustomers.length > 0 && (
          <div className="vn-queue-stack" aria-label="候场医学生">
            {previewCustomers.slice(0, 2).map((customer, index) => {
              const waitingProfile = getCharacterProfile(
                customer.avatar,
                customer.isBoss,
              )

              return (
                <button
                  type="button"
                  className={`vn-queue-card queue-${index + 1} preview-card`}
                  key={customer.id}
                  style={
                    { '--queue-accent': waitingProfile.accentColor } as CSSProperties
                  }
                  disabled
                >
                  <img
                    src={getStagePortraitFrameSrc(
                      customer.avatar,
                      customer.isBoss,
                      waitingProfile.queuePose,
                    )}
                    alt=""
                    loading="eager"
                  />
                  <span>{waitingProfile.title}</span>
                  <small>ETA {customer.etaSeconds}s</small>
                </button>
              )
            })}
          </div>
        )}
        <div className="vn-dialogue empty-dialogue">
          <small>MEDICAL ENGLISH NIGHT SHIFT</small>
          <strong>下一位医学生正在赶来</strong>
          <p>料理台已经预热，下一张术语订单马上入场。</p>
        </div>
      </section>
    )
  }

  const mood = isHandoff ? 'happy' : getCustomerMood(displayCustomer)
  const profile = getCharacterProfile(displayCustomer.avatar, displayCustomer.isBoss)
  const frame = getPortraitFrameKey(mood, isHandoff)
  const patienceRatio = Math.max(
    0,
    Math.round((displayCustomer.patience / displayCustomer.maxPatience) * 100),
  )
  const waitingCustomers = customers
    .filter((customer) => customer.id !== displayCustomer.id)
    .slice(0, 2)
  const visiblePreviewCustomers = previewCustomers.slice(
    0,
    Math.max(0, 2 - waitingCustomers.length),
  )
  const stageStyle = { '--character-accent': profile.accentColor } as CSSProperties
  const dialogueLine = isHandoff
    ? profile.handoffLine
    : displayCustomer.isBoss
      ? displayCustomer.speech
      : profile.linesByMood[mood]

  return (
    <section
      className={`character-stage-panel vn-character-stage mood-${mood} ${
        displayCustomer.isBoss ? 'boss-stage' : ''
      } ${isHandoff ? 'handoff-satisfied' : ''} transition-${transitionState}`}
      aria-label="当前医学生角色舞台"
      style={stageStyle}
    >
      <div className="vn-queue-stack" aria-label="候场医学生">
        {waitingCustomers.map((customer, index) => {
          const waitingMood = getCustomerMood(customer)
          const waitingProfile = getCharacterProfile(customer.avatar, customer.isBoss)

          return (
            <button
              type="button"
              className={`vn-queue-card queue-${index + 1} mood-${waitingMood}`}
              key={customer.id}
              onClick={() => onSelectCustomer(customer.id)}
              style={
                { '--queue-accent': waitingProfile.accentColor } as CSSProperties
              }
            >
              <img
                src={getStagePortraitFrameSrc(
                  customer.avatar,
                  customer.isBoss,
                  waitingProfile.queuePose,
                )}
                alt=""
                loading="eager"
              />
              <span>{waitingProfile.title}</span>
              <small>{getWaitedSeconds(customer)}s</small>
            </button>
          )
        })}
        {visiblePreviewCustomers.map((customer, previewIndex) => {
          const waitingProfile = getCharacterProfile(customer.avatar, customer.isBoss)
          const queueIndex = waitingCustomers.length + previewIndex

          return (
            <button
              type="button"
              className={`vn-queue-card queue-${queueIndex + 1} preview-card`}
              key={customer.id}
              style={
                { '--queue-accent': waitingProfile.accentColor } as CSSProperties
              }
              disabled
            >
              <img
                src={getStagePortraitFrameSrc(
                  customer.avatar,
                  customer.isBoss,
                  waitingProfile.queuePose,
                )}
                alt=""
                loading="eager"
              />
              <span>{waitingProfile.title}</span>
              <small>ETA {customer.etaSeconds}s</small>
            </button>
          )
        })}
      </div>

      <img
        className="vn-main-portrait"
        key={`${displayCustomer.id}-${frame}`}
        src={getStagePortraitFrameSrc(displayCustomer.avatar, displayCustomer.isBoss, frame)}
        alt=""
        data-framing={profile.stageFraming}
      />

      <span className="vn-mood-tag">
        {isHandoff ? profile.satisfiedAction : getUrgencyLabel(displayCustomer)}
      </span>

      <div className="vn-dialogue">
        <small>{displayCustomer.isBoss ? 'PROFESSOR BOSS' : profile.title}</small>
        <strong>{displayCustomer.name}</strong>
        <p>{dialogueLine}</p>
        <em>
          {isHandoff ? '出餐完成' : getUrgencyLabel(displayCustomer)} · 等待{' '}
          {getWaitedSeconds(displayCustomer)}s · {displayCustomer.recipe.name}
        </em>
      </div>

      <div className="vn-patience" aria-label={`耐心 ${patienceRatio}%`}>
        <span style={{ width: `${patienceRatio}%` }} />
      </div>
    </section>
  )
}

export default memo(CustomerQueue)
