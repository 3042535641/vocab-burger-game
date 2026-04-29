import type { Customer } from '../types/game'

type BurgerStationProps = {
  customer?: Customer
}

function BurgerStation({ customer }: BurgerStationProps) {
  const completedStepIds = customer?.steps
    .slice(0, customer.stepIndex)
    .map((step) => step.id)

  const burn = customer?.burn ?? 0
  const pattyClass = burn >= 80 ? 'burned' : burn >= 45 ? 'toasty' : ''

  return (
    <section className="panel burger-station" aria-label="汉堡制作台">
      <div className="section-heading">
        <h2>制作台</h2>
        <span>焦度 {burn}%</span>
      </div>

      <div className="burger-stack">
        {!customer && <span className="empty-plate">等待订单</span>}
        {customer && completedStepIds?.includes('top') && (
          <span className="burger-layer top-bun">面包盖</span>
        )}
        {customer && completedStepIds?.includes('sauce') && (
          <span className="burger-layer sauce">酱汁</span>
        )}
        {customer && completedStepIds?.includes('tomato') && (
          <span className="burger-layer tomato">番茄</span>
        )}
        {customer && completedStepIds?.includes('lettuce') && (
          <span className="burger-layer lettuce">生菜</span>
        )}
        {customer && completedStepIds?.includes('patty') && (
          <span className={`burger-layer patty ${pattyClass}`}>
            {burn >= 80 ? '烧焦肉饼' : '肉饼'}
          </span>
        )}
        {customer && completedStepIds?.includes('bun') && (
          <span className="burger-layer bottom-bun">面包底</span>
        )}
        {customer && completedStepIds?.length === 0 && (
          <span className="empty-plate">空盘子</span>
        )}
      </div>

      <p className="current-step">
        {customer
          ? `当前动作：${customer.steps[customer.stepIndex]?.label ?? '完成汉堡'}`
          : '请选择或等待一位顾客'}
      </p>
    </section>
  )
}

export default BurgerStation
