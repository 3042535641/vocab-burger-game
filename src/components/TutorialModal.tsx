import { memo } from 'react'

type TutorialModalProps = {
  onClose: () => void
}

function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div
      className="tutorial-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <section className="panel tutorial-panel">
        <p className="eyebrow">医学英语规则速览</p>
        <h2 id="tutorial-title">开店前先看三条</h2>
        <div className="tutorial-steps">
          <article>
            <strong>1. 抢答术语</strong>
            <span>看中文医学概念，选择正确英文术语。</span>
          </article>
          <article>
            <strong>2. 制作汉堡</strong>
            <span>答对推进动作；肉饼第一面 55%-85%、焦度低于 45 时翻面最香。</span>
          </article>
          <article>
            <strong>3. 顾客红温</strong>
            <span>医学生约 20 秒开始着急，完成 6 份后教授 Boss 登场。</span>
          </article>
        </div>
        <button type="button" className="primary-action" onClick={onClose}>
          懂了，开煎
        </button>
      </section>
    </div>
  )
}

export default memo(TutorialModal)
