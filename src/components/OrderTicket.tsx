import { memo, useEffect, useRef } from 'react'
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
  const recipeListRef = useRef<HTMLOListElement>(null)
  const currentStepRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const list = recipeListRef.current
    const currentStep = currentStepRef.current

    if (!list || !currentStep) {
      return
    }

    const listRect = list.getBoundingClientRect()
    const stepRect = currentStep.getBoundingClientRect()
    const topDelta = stepRect.top - listRect.top
    const bottomDelta = stepRect.bottom - listRect.bottom

    if (topDelta < 0) {
      list.scrollBy({ top: topDelta - 8, behavior: 'smooth' })
    } else if (bottomDelta > 0) {
      list.scrollBy({ top: bottomDelta + 8, behavior: 'smooth' })
    }
  }, [customer?.id, customer?.stepIndex])

  return (
    <section className="panel order-ticket" aria-label="医学汉堡订单小票">
      <div className="section-heading">
        <h2>订单小票</h2>
        <span>
          {bossSpawned
            ? '教授 Boss'
            : `${Math.min(servedCount, targetServed)}/${targetServed}`}
        </span>
      </div>

      {!customer ? (
        <p className="muted">当前没有选中的医学生订单。</p>
      ) : (
        <>
          <div className="ticket-meta">
            <strong>{customer.recipe.name}</strong>
            <span>{customer.recipe.tag}</span>
          </div>
          <ol className="recipe-list" ref={recipeListRef}>
            {customer.steps.map((step, index) => (
              <li
                ref={index === customer.stepIndex ? currentStepRef : undefined}
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
