import type { Customer, Mood } from '../types/game'
import { maxCustomers } from '../constants/game'

const getMood = (customer: Customer): Mood => {
  const waitedSeconds = customer.maxPatience - customer.patience

  if (customer.patience <= 12) {
    return 'angry'
  }

  if (waitedSeconds >= 20) {
    return 'worried'
  }

  if (waitedSeconds >= 10) {
    return 'waiting'
  }

  return 'happy'
}

const moodLabels: Record<Mood, string> = {
  happy: '期待',
  waiting: '等待中',
  worried: '着急',
  angry: '生气',
}

const moodFaces: Record<Mood, string> = {
  happy: '^_^',
  waiting: '-_-',
  worried: 'o_o',
  angry: '>_<',
}

type CustomerQueueProps = {
  customers: Customer[]
  activeCustomerId?: number
  onSelectCustomer: (id: number) => void
}

function CustomerQueue({
  customers,
  activeCustomerId,
  onSelectCustomer,
}: CustomerQueueProps) {
  if (customers.length === 0) {
    return (
      <section className="panel customer-line">
        <h2>顾客队伍</h2>
        <p className="muted">暂时没人排队，准备迎接下一位顾客。</p>
      </section>
    )
  }

  return (
    <section className="panel customer-line" aria-label="顾客队伍">
      <div className="section-heading">
        <h2>顾客队伍</h2>
        <span>{customers.length}/{maxCustomers}</span>
      </div>
      <div className="customer-list">
        {customers.map((customer) => {
          const mood = getMood(customer)
          const patienceRatio = Math.max(
            0,
            Math.round((customer.patience / customer.maxPatience) * 100),
          )

          return (
            <button
              type="button"
              className={`customer-ticket ${mood} ${
                customer.id === activeCustomerId ? 'active' : ''
              } ${customer.isBoss ? 'boss-ticket' : ''}`}
              key={customer.id}
              onClick={() => onSelectCustomer(customer.id)}
            >
              <span
                className={`customer-avatar avatar-${customer.avatar} face-${mood}`}
                aria-hidden="true"
              >
                <span className="face-text">
                  {customer.isBoss ? 'BOSS' : moodFaces[mood]}
                </span>
              </span>
              <span className="customer-info">
                <strong>{customer.name}</strong>
                <span>{customer.isBoss ? '超级顾客' : '经典汉堡'}</span>
                <span>情绪：{moodLabels[mood]}</span>
              </span>
              <span className={`speech-bubble ${mood}`}>{customer.speech}</span>
              <span className="patience-bar" aria-label={`耐心 ${patienceRatio}%`}>
                <span style={{ width: `${patienceRatio}%` }} />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default CustomerQueue
