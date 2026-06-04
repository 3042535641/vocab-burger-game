import { memo } from 'react'
import type { WordEntry } from '../data/words'
import type { BurgerRecipe } from '../types/game'
import type { GameRecords } from '../types/records'
import { categoryLabels } from '../utils/display'
import TutorialModal from './TutorialModal'

type StartScreenProps = {
  records: GameRecords
  previewRecipes: BurgerRecipe[]
  previewWords: WordEntry[]
  musicEnabled: boolean
  showTutorial: boolean
  onStart: () => void
  onShowTutorial: () => void
  onCloseTutorial: () => void
  onOpenWordManager: () => void
  onToggleMusic: () => void
}

function StartScreen({
  records,
  previewRecipes,
  previewWords,
  musicEnabled,
  showTutorial,
  onStart,
  onShowTutorial,
  onCloseTutorial,
  onOpenWordManager,
  onToggleMusic,
}: StartScreenProps) {
  return (
    <main className="game-shell start-screen">
      <section
        className="panel intro-panel start-dashboard"
        aria-labelledby="game-title"
      >
        <div className="intro-hero">
          <div>
            <p className="eyebrow">Medical Vocab Burger Shop</p>
            <h1 id="game-title">医学英语汉堡店</h1>
            <p>
              医学生会随机排队点餐。先看本局医学英语术语，再看中文概念选英文，
              答对才能完成汉堡动作；答错会扣分、掉耐心，还可能把组织肉饼煎焦。
            </p>
          </div>
        </div>

        <div className="record-strip" aria-label="历史记录">
          <span>最高分 {records.highScore}</span>
          <span>最佳 Combo {records.bestCombo}</span>
          <span>
            通关 {records.wins}/{records.rounds}
          </span>
        </div>

        <section className="recipe-preview" aria-labelledby="recipe-preview-title">
          <div className="section-heading">
            <h2 id="recipe-preview-title">本局医学汉堡配方</h2>
            <span>随机出单</span>
          </div>
          <div className="recipe-preview-grid">
            {previewRecipes.map((recipe) => (
              <article
                className={`recipe-preview-card recipe-${recipe.id}`}
                key={recipe.id}
              >
                <strong>{recipe.name}</strong>
                <span>{recipe.tag}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="word-preview" aria-labelledby="preview-title">
          <div className="section-heading">
            <h2 id="preview-title">本局医学术语预习</h2>
            <span>{previewWords.length} 个词</span>
          </div>
          <div className="preview-grid">
            {previewWords.map((word) => (
              <article className="preview-card" key={word.id}>
                <strong>{word.chinese}</strong>
                <span>{word.english}</span>
                <small>
                  {categoryLabels[word.category]} / 难度 {word.difficulty}
                </small>
                {word.note && <em>{word.note}</em>}
              </article>
            ))}
          </div>
        </section>

        <div className="start-actions">
          <button type="button" className="primary-action" onClick={onStart}>
            开始营业
          </button>
          <button type="button" className="small-action" onClick={onShowTutorial}>
            规则说明
          </button>
          <button type="button" className="small-action" onClick={onOpenWordManager}>
            管理词库
          </button>
          <button type="button" className="small-action" onClick={onToggleMusic}>
            {musicEnabled ? '音乐开' : '音乐关'}
          </button>
        </div>
      </section>
      {showTutorial && <TutorialModal onClose={onCloseTutorial} />}
    </main>
  )
}

export default memo(StartScreen)
