import type { WordEntry } from '../data/words'

export type WordDraft = {
  chinese: string
  english: string
  wrongOptions: string
  category: WordEntry['category']
  difficulty: WordEntry['difficulty']
}

export const categoryOptions: WordEntry['category'][] = [
  'food',
  'action',
  'shop',
  'feeling',
]

export const emptyWordDraft: WordDraft = {
  chinese: '',
  english: '',
  wrongOptions: '',
  category: 'shop',
  difficulty: 1,
}

const fallbackWrongOptions = [
  'cell',
  'tissue',
  'diagnosis',
  'symptom',
  'treatment',
  'pathology',
  'prognosis',
  'antibiotic',
  'vaccine',
  'dosage',
  'benign',
  'malignant',
]

export const createCustomWordId = () =>
  `custom-${Date.now()}-${Math.floor(Math.random() * 999)}`

export const normalizeEnglish = (value: string) => value.trim().toLowerCase()

export const getAutoWrongOptions = (english: string) => {
  const normalizedEnglish = normalizeEnglish(english)
  const typoOption =
    normalizedEnglish.length > 4
      ? normalizedEnglish.slice(0, -1)
      : `${normalizedEnglish}ing`
  const similarOption = normalizedEnglish.includes('tion')
    ? normalizedEnglish.replace('tion', 'sion')
    : `${normalizedEnglish}ology`

  return [...fallbackWrongOptions, typoOption, similarOption]
    .map(normalizeEnglish)
    .filter((option) => option && option !== normalizedEnglish)
    .filter((option, index, list) => list.indexOf(option) === index)
    .slice(0, 3)
}

export const getUniqueWordsByEnglish = (wordPool: WordEntry[]) => {
  const seenEnglish = new Set<string>()

  return wordPool.filter((word) => {
    const normalizedEnglish = normalizeEnglish(word.english)

    if (seenEnglish.has(normalizedEnglish)) {
      return false
    }

    seenEnglish.add(normalizedEnglish)
    return true
  })
}

export const toWordDraft = (word: WordEntry): WordDraft => ({
  chinese: word.chinese,
  english: word.english,
  wrongOptions: word.wrongOptions.join(', '),
  category: word.category,
  difficulty: word.difficulty,
})

export const normalizeWordDraft = (
  draft: WordDraft,
  id = createCustomWordId(),
): WordEntry | string => {
  const chinese = draft.chinese.trim()
  const english = normalizeEnglish(draft.english)
  const manualWrongOptions = draft.wrongOptions
    .split(',')
    .map(normalizeEnglish)
    .filter(Boolean)
  const wrongOptions =
    manualWrongOptions.length > 0 ? manualWrongOptions : getAutoWrongOptions(english)
  const uniqueWrongOptions = [...new Set(wrongOptions)].slice(0, 3)

  if (!chinese || !english) {
    return '请至少填写中文医学概念和英文术语。'
  }

  if (uniqueWrongOptions.length !== 3) {
    return '自动干扰项不足，请展开高级设置并手动填写 3 个不同的干扰项。'
  }

  if (uniqueWrongOptions.includes(english)) {
    return '错误选项里不能包含正确答案。'
  }

  return {
    id,
    chinese,
    english,
    wrongOptions: uniqueWrongOptions,
    category: draft.category,
    difficulty: draft.difficulty,
  }
}

export const isWordEntry = (value: unknown): value is WordEntry => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const word = value as Partial<WordEntry>

  return (
    typeof word.id === 'string' &&
    typeof word.chinese === 'string' &&
    typeof word.english === 'string' &&
    Array.isArray(word.wrongOptions) &&
    word.wrongOptions.length >= 3 &&
    categoryOptions.includes(word.category as WordEntry['category']) &&
    [1, 2, 3].includes(Number(word.difficulty))
  )
}
