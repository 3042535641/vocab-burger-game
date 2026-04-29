import type { Customer, Mood } from '../types/game'

const getMood = (customer: Customer): Mood => {
  const ratio = customer.patience / customer.maxPatience

  if (ratio <= 0.22) {
    return 'angry'
  }

  if (ratio <= 0.45) {
    return 'worried'
  }

  if (ratio <= 0.7) {
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
        <span>{customers.length}/3</span>
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
                className={`customer-avatar avatar-${customer.avatar}`}
                aria-hidden="true"
              >
                {customer.isBoss ? 'BOSS' : ''}
              </span>
              <span className="customer-info">
                <strong>{customer.name}</strong>
                <span>{customer.isBoss ? '超级顾客' : '经典汉堡'}</span>
                <span>情绪：{moodLabels[mood]}</span>
              </span>
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
