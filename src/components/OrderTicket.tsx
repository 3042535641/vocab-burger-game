import { memo } from 'react'
import type { Customer } from '../types/game'

type OrderTicketProps = {
  customer?: Customer
  servedCount: number
  targetServed: number
  bossSpawned: boolean
}

function OrderTicket({
  customer,
  servedCount,
  targetServed,
  bossSpawned,
}: OrderTicketProps) {
  return (
    <section className="panel order-ticket" aria-label="订单小票">
      <div className="section-heading">
        <h2>订单小票</h2>
        <span>
          {bossSpawned
            ? 'Boss 战'
            : `${Math.min(servedCount, targetServed)}/${targetServed}`}
        </span>
      </div>

      {!customer ? (
        <p className="muted">当前没有选中的顾客。</p>
      ) : (
        <>
          <div className="ticket-meta">
            <strong>{customer.recipe.name}</strong>
            <span>{customer.recipe.tag}</span>
          </div>
          <ol className="recipe-list">
            {customer.steps.map((step, index) => (
              <li
                className={
                  index < customer.stepIndex
                    ? 'done'
                    : index === customer.stepIndex
                      ? 'current'
                      : ''
                }
                key={`${customer.id}-${step.id}-${index}`}
              >
                <span>{step.ingredient}</span>
                <small>{step.word.chinese}</small>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

export default memo(OrderTicket, (previous, next) => {
  const previousCustomer = previous.customer
  const nextCustomer = next.customer

  return (
    previous.servedCount === next.servedCount &&
    previous.targetServed === next.targetServed &&
    previous.bossSpawned === next.bossSpawned &&
    previousCustomer?.id === nextCustomer?.id &&
    previousCustomer?.stepIndex === nextCustomer?.stepIndex &&
    previousCustomer?.recipe.id === nextCustomer?.recipe.id
  )
})
