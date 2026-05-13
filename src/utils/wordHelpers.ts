import type { WordEntry } from '../data/words'

export const normalizeEnglish = (value: string) => value.trim().toLowerCase()

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
