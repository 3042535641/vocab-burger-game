import { memo } from 'react'
import type { Customer } from '../types/game'

const grillSlotIndexes = [0, 1]

type BurgerStationProps = {
  customer?: Customer
  customers: Customer[]
  activeCustomerId?: number
  onSelectCustomer: (id: number) => void
}

function BurgerStation({
  customer,
  customers,
  activeCustomerId,
  onSelectCustomer,
}: BurgerStationProps) {
  const completedStepIds = customer?.steps
    .slice(0, customer.stepIndex)
    .map((step) => step.id)
  const burn = customer?.burn ?? 0
  const firstSide = customer?.firstSideDoneness ?? 0
  const secondSide = customer?.secondSideDoneness ?? 0
  const pattyClass = burn >= 80 ? 'burned' : burn >= 45 ? 'toasty' : ''
  const flipWindowClass =
    firstSide >= 55 && firstSide <= 85 && burn < 45 ? 'ready' : ''
  const isPattyOnGrill =
    customer?.pattySide === 'first' || customer?.pattySide === 'second'
  const isPattyPlated =
    customer?.pattySide === 'done' ||
    Boolean(
      completedStepIds?.some((stepId) =>
        ['lettuce', 'tomato', 'sauce', 'top'].includes(stepId),
      ),
    )

  return (
    <section className="panel burger-station" aria-label="医学英语汉堡制作台">
      <div className="section-heading">
        <h2>术语制作台</h2>
        <span>
          A面 {firstSide}% / B面 {secondSide}% · 焦度 {burn}%
        </span>
      </div>

      <div className="grill-slots" aria-label="煎锅槽位">
        {grillSlotIndexes.map((slotIndex) => {
          const slotCustomer = customers[slotIndex]
          const isActive = slotCustomer?.id === activeCustomerId

          if (!slotCustomer) {
            return (
              <span className="grill-slot empty" key={slotIndex}>
                空锅位
              </span>
            )
          }

          return (
            <button
              type="button"
              className={`grill-slot ${isActive ? 'active' : ''} ${
                slotCustomer.burn >= 60 ? 'danger' : ''
              }`}
              key={slotCustomer.id}
              onClick={() => onSelectCustomer(slotCustomer.id)}
            >
              <strong>{slotCustomer.isBoss ? '教授' : `锅 ${slotIndex + 1}`}</strong>
              <span>{slotCustomer.recipe.name}</span>
              <small>
                A {slotCustomer.firstSideDoneness}% / B{' '}
                {slotCustomer.secondSideDoneness}%
              </small>
            </button>
          )
        })}
      </div>

      <div
        className={`grill-lights ${isPattyOnGrill ? 'grill-cooking' : ''}`}
        aria-hidden="true"
      >
        <span />
        <span />
        {isPattyOnGrill && (
          <span className={`grill-patty ${pattyClass}`}>
            {customer?.pattySide === 'first' ? 'A 面' : 'B 面'}
          </span>
        )}
      </div>

      <div className="burger-stack">
        {!customer && <span className="empty-plate">等待订单</span>}
        {customer && completedStepIds?.includes('top') && (
          <span className="burger-layer top-bun">护理面包盖</span>
        )}
        {customer && completedStepIds?.includes('sauce') && (
          <span className="burger-layer sauce">治疗酱</span>
        )}
        {customer && completedStepIds?.includes('tomato') && (
          <span className="burger-layer tomato">炎症番茄</span>
        )}
        {customer && completedStepIds?.includes('lettuce') && (
          <span className="burger-layer lettuce">症状生菜</span>
        )}
        {customer && isPattyPlated && (
          <span className={`burger-layer patty ${pattyClass}`}>
            {burn >= 80 ? '烤焦组织肉饼' : '组织肉饼'}
          </span>
        )}
        {customer && completedStepIds?.includes('bun') && (
          <span className="burger-layer bottom-bun">细胞词根底</span>
        )}
        {customer && completedStepIds?.length === 0 && (
          <span className="empty-plate">空盘子</span>
        )}
      </div>

      {customer && (
        <div className="cook-meters" aria-label="肉饼状态">
          <div>
            <span>A面</span>
            <div className="meter">
              <span style={{ width: `${firstSide}%` }} />
            </div>
          </div>
          <div>
            <span>B面</span>
            <div className="meter">
              <span style={{ width: `${secondSide}%` }} />
            </div>
          </div>
          <div>
            <span>焦度</span>
            <div className="meter burn-meter">
              <span style={{ width: `${burn}%` }} />
            </div>
          </div>
          <p className={`flip-window ${flipWindowClass}`}>
            {customer.pattySide === 'done'
              ? '肉饼已出锅，熟度锁定，不再继续变焦。'
              : customer.pattySide === 'second'
                ? 'B 面正在煎，答对下一步即可出锅上堡。'
                : flipWindowClass
                  ? '第一面最佳翻面窗口！'
                  : '第一面 55%-85% 时翻面最香'}
          </p>
        </div>
      )}

      <p className="current-step">
        {customer
          ? `当前动作：${customer.steps[customer.stepIndex]?.label ?? '完成医学汉堡'}`
          : '请选择或等待一位医学生'}
      </p>
    </section>
  )
}

const customerRenderKey = (customer?: Customer) =>
  customer
    ? [
        customer.id,
        customer.stepIndex,
        customer.firstSideDoneness,
        customer.secondSideDoneness,
        customer.burn,
        customer.pattySide,
        customer.recipe.id,
        customer.isBoss,
      ].join(':')
    : 'empty'

const queueRenderKey = (customers: Customer[]) =>
  customers
    .map(
      (customer) =>
        `${customer.id}:${customer.stepIndex}:${customer.firstSideDoneness}:${customer.secondSideDoneness}:${customer.burn}:${customer.recipe.id}`,
    )
    .join('|')

export default memo(
  BurgerStation,
  (previous, next) =>
    previous.activeCustomerId === next.activeCustomerId &&
    customerRenderKey(previous.customer) === customerRenderKey(next.customer) &&
    queueRenderKey(previous.customers) === queueRenderKey(next.customers),
)
