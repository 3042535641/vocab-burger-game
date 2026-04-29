import { useState } from 'react'
import type { FormEvent } from 'react'
import type { WordEntry } from '../data/words'

type WordManagerProps = {
  customWords: WordEntry[]
  onAddWord: (word: WordEntry) => boolean
  onDeleteWord: (id: string) => void
  onClose: () => void
}

const categoryOptions: WordEntry['category'][] = [
  'food',
  'action',
  'shop',
  'feeling',
]

const createId = () => `custom-${Date.now()}-${Math.floor(Math.random() * 999)}`

function WordManager({
  customWords,
  onAddWord,
  onDeleteWord,
  onClose,
}: WordManagerProps) {
  const [chinese, setChinese] = useState('')
  const [english, setEnglish] = useState('')
  const [wrongOptions, setWrongOptions] = useState('')
  const [category, setCategory] = useState<WordEntry['category']>('shop')
  const [difficulty, setDifficulty] = useState<WordEntry['difficulty']>(1)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanedChinese = chinese.trim()
    const cleanedEnglish = english.trim().toLowerCase()
    const options = wrongOptions
      .split(',')
      .map((option) => option.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 3)

    if (!cleanedChinese || !cleanedEnglish || options.length !== 3) {
      setError('请填写中文、英文，并用英文逗号分隔 3 个错误选项。')
      return
    }

    if (options.includes(cleanedEnglish)) {
      setError('错误选项里不能包含正确答案。')
      return
    }

    const added = onAddWord({
      id: createId(),
      chinese: cleanedChinese,
      english: cleanedEnglish,
      wrongOptions: options,
      category,
      difficulty,
    })

    if (!added) {
      setError('这个英文单词已经在题库里了，请换一个。')
      return
    }

    setChinese('')
    setEnglish('')
    setWrongOptions('')
    setError('')
  }

  return (
    <main className="game-shell manager-shell">
      <section className="panel manager-panel" aria-labelledby="manager-title">
        <div className="manager-header">
          <div>
            <p className="eyebrow">Word Bank Lab</p>
            <h1 id="manager-title">词库管理</h1>
          </div>
          <button type="button" className="small-action" onClick={onClose}>
            返回游戏
          </button>
        </div>

        <form className="word-form" onSubmit={handleSubmit}>
          <label>
            中文
            <input
              value={chinese}
              onChange={(event) => setChinese(event.target.value)}
              placeholder="例如：离谱"
            />
          </label>
          <label>
            英文
            <input
              value={english}
              onChange={(event) => setEnglish(event.target.value)}
              placeholder="例如：wild"
            />
          </label>
          <label>
            3 个错误选项
            <input
              value={wrongOptions}
              onChange={(event) => setWrongOptions(event.target.value)}
              placeholder="weird, windy, whale"
            />
          </label>
          <label>
            分类
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as WordEntry['category'])
              }
            >
              {categoryOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            难度
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(Number(event.target.value) as WordEntry['difficulty'])
              }
            >
              <option value={1}>1 简单</option>
              <option value={2}>2 中等</option>
              <option value={3}>3 挑战</option>
            </select>
          </label>
          <button type="submit" className="primary-action">
            加入题库
          </button>
        </form>

        {error && <p className="manager-error">{error}</p>}

        <div className="word-list">
          {customWords.length === 0 ? (
            <p className="muted">
              还没有自定义词。添加后会自动保存到浏览器，并混入游戏题目和开局预习词表。
            </p>
          ) : (
            customWords.map((word) => (
              <article className="word-card" key={word.id}>
                <div>
                  <strong>{word.chinese}</strong>
                  <span>{word.english}</span>
                </div>
                <small>
                  {word.category} / 难度 {word.difficulty} / 干扰项：
                  {word.wrongOptions.join(', ')}
                </small>
                <button
                  type="button"
                  className="small-action danger"
                  onClick={() => onDeleteWord(word.id)}
                >
                  删除
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}

export default WordManager
