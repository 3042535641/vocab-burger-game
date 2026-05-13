import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { WordEntry } from '../data/words'
import { categoryLabels } from '../utils/display'
import {
  categoryOptions,
  createCustomWordId,
  emptyWordDraft,
  isWordEntry,
  normalizeWordDraft,
  toWordDraft,
  type WordDraft,
} from '../utils/wordHelpers'

type WordManagerProps = {
  customWords: WordEntry[]
  onAddWord: (word: WordEntry) => boolean
  onUpdateWord: (word: WordEntry) => boolean
  onDeleteWord: (id: string) => void
  onImportWords: (words: WordEntry[]) => number
  onClose: () => void
}

function WordManager({
  customWords,
  onAddWord,
  onUpdateWord,
  onDeleteWord,
  onImportWords,
  onClose,
}: WordManagerProps) {
  const [draft, setDraft] = useState<WordDraft>(emptyWordDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<'all' | WordEntry['category']>(
    'all',
  )
  const [difficultyFilter, setDifficultyFilter] = useState<
    'all' | WordEntry['difficulty']
  >('all')
  const [showAdvancedForm, setShowAdvancedForm] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredWords = useMemo(
    () =>
      customWords.filter(
        (word) =>
          (categoryFilter === 'all' || word.category === categoryFilter) &&
          (difficultyFilter === 'all' || word.difficulty === difficultyFilter),
      ),
    [categoryFilter, customWords, difficultyFilter],
  )

  const setDraftField = <Key extends keyof WordDraft>(
    key: Key,
    value: WordDraft[Key],
  ) => {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }))
    setError('')
    setNotice('')
  }

  const resetForm = () => {
    setDraft(emptyWordDraft)
    setEditingId(null)
    setShowAdvancedForm(false)
    setError('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalized = normalizeWordDraft(draft, editingId ?? createCustomWordId())

    if (typeof normalized === 'string') {
      setError(normalized)
      return
    }

    const saved = editingId
      ? onUpdateWord(normalized)
      : onAddWord(normalized)

    if (!saved) {
      setError('这个医学英语术语已经在题库里了，请换一个。')
      return
    }

    setNotice(editingId ? '已更新术语。' : '已加入医学英语题库。')
    resetForm()
  }

  const handleEdit = (word: WordEntry) => {
    setDraft(toWordDraft(word))
    setEditingId(word.id)
    setShowAdvancedForm(true)
    setError('')
    setNotice('')
  }

  const handleExport = () => {
    const payload = JSON.stringify(customWords, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'medical-vocab-burger-custom-words.json'
    link.click()
    URL.revokeObjectURL(url)
    setNotice(`已导出 ${customWords.length} 个自定义医学术语。`)
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const list = Array.isArray(parsed) ? parsed : [parsed]
      const validWords = list.filter(isWordEntry).map((word) => ({
        ...word,
        difficulty: Number(word.difficulty) as WordEntry['difficulty'],
      }))
      const addedCount = onImportWords(validWords)

      setNotice(`已导入 ${addedCount} 个新医学术语，重复或无效词已跳过。`)
      setError('')
    } catch {
      setError('导入失败：请选择合法的 JSON 词库文件。')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <main className="game-shell manager-shell">
      <section className="panel manager-panel" aria-labelledby="manager-title">
        <div className="manager-header">
          <div>
            <p className="eyebrow">Medical Word Bank Lab</p>
            <h1 id="manager-title">医学英语词库管理</h1>
          </div>
          <button type="button" className="small-action" onClick={onClose}>
            返回汉堡店
          </button>
        </div>

        <form
          className={`word-form ${showAdvancedForm ? 'advanced-open' : ''}`}
          onSubmit={handleSubmit}
        >
          <label>
            中文医学概念
            <input
              value={draft.chinese}
              onChange={(event) => setDraftField('chinese', event.target.value)}
              placeholder="例如：炎症"
            />
          </label>
          <label>
            英文术语
            <input
              value={draft.english}
              onChange={(event) => setDraftField('english', event.target.value)}
              placeholder="例如：inflammation"
            />
          </label>
          <button type="submit" className="primary-action">
            {editingId ? '保存修改' : '一键加入题库'}
          </button>
          <button
            type="button"
            className="small-action"
            onClick={() => setShowAdvancedForm((isOpen) => !isOpen)}
          >
            {showAdvancedForm ? '收起高级' : '高级设置'}
          </button>
          <p className="quick-add-tip">
            默认会自动生成 3 个干扰项，并按“课堂场景 / 难度 1”保存；需要精修再展开高级设置。
          </p>

          <label className="advanced-field">
            3 个干扰项
            <input
              value={draft.wrongOptions}
              onChange={(event) =>
                setDraftField('wrongOptions', event.target.value)
              }
              placeholder="weird, windy, whale"
            />
          </label>
          <label className="advanced-field">
            分类
            <select
              value={draft.category}
              onChange={(event) =>
                setDraftField('category', event.target.value as WordEntry['category'])
              }
            >
              {categoryOptions.map((option) => (
                <option value={option} key={option}>
                  {categoryLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="advanced-field">
            难度
            <select
              value={draft.difficulty}
              onChange={(event) =>
                setDraftField(
                  'difficulty',
                  Number(event.target.value) as WordEntry['difficulty'],
                )
              }
            >
              <option value={1}>1 简单</option>
              <option value={2}>2 中等</option>
              <option value={3}>3 挑战</option>
            </select>
          </label>
          {editingId && (
            <button type="button" className="small-action" onClick={resetForm}>
              取消编辑
            </button>
          )}
        </form>

        <div className="manager-tools">
          <label>
            分类筛选
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value as 'all' | WordEntry['category'],
                )
              }
            >
              <option value="all">全部分类</option>
              {categoryOptions.map((option) => (
                <option value={option} key={option}>
                  {categoryLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label>
            难度筛选
            <select
              value={difficultyFilter}
              onChange={(event) =>
                setDifficultyFilter(
                  event.target.value === 'all'
                    ? 'all'
                    : (Number(event.target.value) as WordEntry['difficulty']),
                )
              }
            >
              <option value="all">全部难度</option>
              <option value={1}>1 简单</option>
              <option value={2}>2 中等</option>
              <option value={3}>3 挑战</option>
            </select>
          </label>
          <button type="button" className="small-action" onClick={handleExport}>
            导出医学词库
          </button>
          <button
            type="button"
            className="small-action"
            onClick={() => fileInputRef.current?.click()}
          >
            导入医学词库
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="word-import-input"
            onChange={handleImport}
          />
        </div>

        {error && <p className="manager-error">{error}</p>}
        {notice && <p className="manager-notice">{notice}</p>}

        <div className="word-list">
          {filteredWords.length === 0 ? (
            <p className="muted">
              当前筛选下没有自定义医学术语。导入或添加后会自动保存到浏览器，并混入游戏题目和开局预习词表。
            </p>
          ) : (
            filteredWords.map((word) => (
              <article className="word-card" key={word.id}>
                <div>
                  <strong>{word.chinese}</strong>
                  <span>{word.english}</span>
                </div>
                <small>
                  {categoryLabels[word.category]} / 难度 {word.difficulty} / 干扰项：
                  {word.wrongOptions.join(', ')}
                </small>
                <div className="word-card-actions">
                  <button
                    type="button"
                    className="small-action"
                    onClick={() => handleEdit(word)}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="small-action danger"
                    onClick={() => onDeleteWord(word.id)}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}

export default WordManager
