import type { WordEntry } from '../data/words'
import {
  customWordsStorageKey,
  recordsStorageKey,
  settingsStorageKey,
} from '../constants/game'
import { defaultRecords, type GameRecords } from '../types/records'
import { defaultSettings, type GameSettings } from '../types/settings'

export const loadCustomWords = (): WordEntry[] => {
  try {
    const rawWords = window.localStorage.getItem(customWordsStorageKey)

    if (!rawWords) {
      return []
    }

    const parsedWords = JSON.parse(rawWords) as WordEntry[]

    return parsedWords.filter(
      (word) =>
        word.id &&
        word.chinese &&
        word.english &&
        Array.isArray(word.wrongOptions) &&
        word.wrongOptions.length >= 3,
    )
  } catch {
    return []
  }
}

export const saveCustomWords = (nextWords: WordEntry[]) => {
  window.localStorage.setItem(customWordsStorageKey, JSON.stringify(nextWords))
}

export const loadRecords = (): GameRecords => {
  try {
    const rawRecords = window.localStorage.getItem(recordsStorageKey)

    if (!rawRecords) {
      return defaultRecords
    }

    return { ...defaultRecords, ...(JSON.parse(rawRecords) as GameRecords) }
  } catch {
    return defaultRecords
  }
}

export const saveRecords = (nextRecords: GameRecords) => {
  window.localStorage.setItem(recordsStorageKey, JSON.stringify(nextRecords))
}

export const loadSettings = (): GameSettings => {
  try {
    const rawSettings = window.localStorage.getItem(settingsStorageKey)

    if (!rawSettings) {
      return defaultSettings
    }

    return { ...defaultSettings, ...(JSON.parse(rawSettings) as GameSettings) }
  } catch {
    return defaultSettings
  }
}

export const saveSettings = (nextSettings: GameSettings) => {
  window.localStorage.setItem(settingsStorageKey, JSON.stringify(nextSettings))
}
