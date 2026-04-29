import type { WordEntry } from '../data/words'

export type GameStatus = 'idle' | 'playing' | 'ended'

export type Mood = 'happy' | 'waiting' | 'worried' | 'angry'

export type BurgerStep = {
  id: string
  label: string
  stationText: string
  ingredient: string
  word: WordEntry
}

export type Customer = {
  id: number
  name: string
  avatar: string
  patience: number
  maxPatience: number
  stepIndex: number
  burn: number
  mistakes: number
  isBoss: boolean
  steps: BurgerStep[]
}

export type Feedback = {
  kind: 'correct' | 'wrong' | 'info'
  message: string
} | null

export type AnswerQuestion = {
  chinese: string
  correctAnswer: string
  options: string[]
}
