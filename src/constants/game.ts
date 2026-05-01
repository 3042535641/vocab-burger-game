export const maxCustomers = 3
export const targetRegularServed = 6
export const basePatience = 75
export const bossPatience = 58
export const correctScore = 12
export const comboBonus = 3
export const wrongPenalty = 5

export const customWordsStorageKey = 'vocab-burger-custom-words'
export const recordsStorageKey = 'vocab-burger-records'

export const stepWordIds = ['bun', 'patty', 'flip', 'lettuce', 'tomato', 'sauce']

export const bossStepWordIds = [
  'bun',
  'patty',
  'flip',
  'lettuce',
  'tomato',
  'sauce',
  'perfect',
]

export const impactDurations = {
  correct: 1100,
  wrong: 1300,
  serve: 1400,
  victory: 21000,
} as const

export type ImpactKind = keyof typeof impactDurations
