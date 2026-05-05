import {
  basePatience,
  bossPatience,
  bossStepWordIds,
  stepWordIds,
  targetRegularServed,
} from '../constants/game'
import { words, type WordEntry } from '../data/words'
import type { AnswerQuestion, BurgerRecipe, BurgerStep, Customer } from '../types/game'

export const customerProfiles = [
  { name: '小明', avatar: 'round' },
  { name: '安娜', avatar: 'star' },
  { name: 'Leo', avatar: 'cap' },
  { name: '糖糖', avatar: 'bow' },
  { name: '阿杰', avatar: 'shade' },
  { name: 'Mia', avatar: 'bun' },
]

const recipes: BurgerRecipe[] = [
  { id: 'classic', name: '经典课堂堡', tag: '均衡配方' },
  { id: 'green', name: '生菜冷静堡', tag: '多菜清爽' },
  { id: 'tomato', name: '番茄冲刺堡', tag: '酸甜加速' },
  { id: 'sauce', name: '爆酱记忆堡', tag: '酱汁加倍' },
]

export const recipeCatalog = recipes

export const idleLines = [
  '老板，来个能背会单词的汉堡。',
  '我饿了，但我更怕考试。',
  '快点快点，我的胃在背单词。',
  '这家店怎么还考英语？离谱但上头。',
]

export const correctLines = [
  '可以，这口知识有嚼劲。',
  '答对了，给你打个精神小费。',
  '这波像开了单词挂。',
  '汉堡和脑子都熟了。',
]

export const wrongLines = [
  '啊？这个答案把我耐心煎焦了。',
  '别乱点，我不是实验汉堡。',
  '我的沉默震耳欲聋。',
  '这题错得很有节目效果。',
]

export const bossLines = [
  '我来了，题目加辣，耐心减半。',
  '答错一次，我就用眼神煎肉饼。',
  '让我看看谁是背词区传奇。',
]

export const bossVictoryLines = [
  'Boss 破防：这汉堡怎么还带知识点暴击？',
  '全班认证：你把 Boss 和生词一起煎熟了。',
  '今日名场面：Vocab Burger 店长封神。',
]

export const pickLine = (lines: string[], seed: number) =>
  lines[seed % lines.length]

export const pickRecipe = (id: number, isBoss: boolean) =>
  isBoss
    ? { id: 'boss', name: '终极 Boss 破防堡', tag: '全配方加压' }
    : recipes[id % recipes.length]

export const getWaitingLine = (customer: Customer) => {
  const waitedSeconds = customer.maxPatience - customer.patience

  if (customer.isBoss) {
    return waitedSeconds >= 20
      ? 'Boss：20 秒了，还没好？我开始加压了。'
      : customer.speech
  }

  if (customer.patience <= 12) {
    return '再不上菜，我就把菜单背下来投诉。'
  }

  if (waitedSeconds >= 20) {
    return '我已经等 20 秒了，lettuce 都快拼成 le-t-tu-ce 了。'
  }

  return customer.speech
}

export const getRandomDelay = (served: number, queueSize = 0) => {
  if (queueSize === 0) {
    return 1100 + Math.floor(Math.random() * 900)
  }

  const servedPressure = Math.min(served, targetRegularServed - 1) * 620
  const baseDelay = Math.max(4800, 9200 - servedPressure)
  const randomWindow = Math.max(2200, 4300 - served * 320)

  return baseDelay + Math.floor(Math.random() * randomWindow)
}

export const getTargetQueueSize = (served: number) => {
  if (served >= 2) {
    return 2
  }

  return 1
}

export type CustomerTickResult = {
  customers: Customer[]
  escapedCount: number
  bossEscaped: boolean
}

export type BurgerScoreResult = {
  burnPenalty: number
  gainedScore: number
  patienceBonus: number
  perfectBonus: number
}

const getAverageDoneness = (firstSide: number, secondSide: number) => {
  if (secondSide <= 0) {
    return Math.round(firstSide)
  }

  return Math.round((firstSide + secondSide) / 2)
}

export const cookPatty = (
  customer: Customer,
  isWrongAnswer = false,
): Customer => {
  if (!customer.pattySide || customer.pattySide === 'done') {
    return customer
  }

  const firstSideIncrement = isWrongAnswer ? 6 : 7
  const secondSideIncrement = 6
  const nextFirstSide =
    customer.pattySide === 'first'
      ? Math.min(100, customer.firstSideDoneness + firstSideIncrement)
      : customer.firstSideDoneness
  const nextSecondSide =
    customer.pattySide === 'second'
      ? Math.min(100, customer.secondSideDoneness + secondSideIncrement)
      : customer.secondSideDoneness
  const hotSide =
    customer.pattySide === 'first' ? nextFirstSide : nextSecondSide
  const burnIncrement = isWrongAnswer
    ? 8
    : hotSide >= 88
      ? 4
      : hotSide >= 72
        ? 2
        : 1

  return {
    ...customer,
    firstSideDoneness: nextFirstSide,
    secondSideDoneness: nextSecondSide,
    doneness: getAverageDoneness(nextFirstSide, nextSecondSide),
    burn: Math.min(100, customer.burn + burnIncrement),
  }
}

export const tickCustomers = (customers: Customer[]): CustomerTickResult => {
  const remainingCustomers: Customer[] = []
  let escapedCount = 0
  let bossEscaped = false

  for (const customer of customers) {
    const nextPatience = customer.patience - 1

    if (nextPatience <= 0) {
      escapedCount += 1
      bossEscaped = bossEscaped || customer.isBoss
      continue
    }

    const nextCustomer = cookPatty({
      ...customer,
      patience: nextPatience,
    })

    remainingCustomers.push({
      ...nextCustomer,
      speech: getWaitingLine(nextCustomer),
    })
  }

  return {
    customers: remainingCustomers,
    escapedCount,
    bossEscaped,
  }
}

export const isPerfectFlipWindow = (customer: Customer) =>
  customer.firstSideDoneness >= 55 &&
  customer.firstSideDoneness <= 85 &&
  customer.burn < 45

export const scoreBurger = (customer: Customer): BurgerScoreResult => {
  const burnPenalty = customer.burn >= 80 ? 25 : customer.burn >= 45 ? 10 : 0
  const patienceBonus = Math.max(0, Math.round(customer.patience / 2))
  const perfectBonus =
    customer.mistakes === 0 &&
    customer.burn < 45 &&
    customer.firstSideDoneness >= 55 &&
    customer.firstSideDoneness <= 85 &&
    customer.secondSideDoneness >= 35 &&
    customer.secondSideDoneness <= 90
      ? 30
      : 0
  const bossBonus = customer.isBoss ? 80 : 0

  return {
    burnPenalty,
    gainedScore: Math.max(
      8,
      35 + patienceBonus + perfectBonus + bossBonus - burnPenalty,
    ),
    patienceBonus,
    perfectBonus,
  }
}

const recipeStepIds = (recipe: BurgerRecipe, isBoss: boolean) => {
  if (isBoss) {
    return bossStepWordIds
  }

  const variants: Record<string, string[]> = {
    classic: stepWordIds,
    green: ['bun', 'patty', 'flip', 'lettuce', 'sauce'],
    tomato: ['bun', 'patty', 'flip', 'tomato', 'lettuce', 'sauce'],
    sauce: ['bun', 'patty', 'flip', 'sauce', 'lettuce', 'tomato'],
  }

  return variants[recipe.id] ?? stepWordIds
}

const pickWordForStep = (
  wordId: string,
  index: number,
  isBoss: boolean,
  wordPool: WordEntry[],
) => {
  const customWords = wordPool.filter((word) => word.id.startsWith('custom-'))
  const shouldUseCustom =
    customWords.length > 0 &&
    !['bun', 'patty', 'flip'].includes(wordId) &&
    (index + (isBoss ? 1 : 0)) % 2 === 1

  if (shouldUseCustom) {
    return customWords[index % customWords.length]
  }

  return wordPool.find((entry) => entry.id === wordId) ?? words[0]
}

export const buildSteps = (
  isBoss: boolean,
  wordPool: WordEntry[],
  recipe: BurgerRecipe,
): BurgerStep[] => {
  const ids = recipeStepIds(recipe, isBoss)

  return ids.map((wordId, index) => {
    const word = pickWordForStep(wordId, index, isBoss, wordPool)
    const stepText: Record<string, { label: string; ingredient: string }> = {
      bun: { label: '放面包底', ingredient: '面包底' },
      patty: { label: '放肉饼开始煎', ingredient: '肉饼' },
      flip: { label: '答对才能翻面', ingredient: '完美翻面' },
      lettuce: { label: '放生菜', ingredient: '生菜' },
      tomato: { label: '放番茄', ingredient: '番茄' },
      sauce: { label: '挤酱并盖上面包', ingredient: '酱汁 + 面包盖' },
      perfect: { label: '喊出完美汉堡', ingredient: 'Perfect Burger' },
    }

    return {
      id: wordId === 'perfect' ? 'top' : wordId,
      label: stepText[wordId].label,
      ingredient: stepText[wordId].ingredient,
      stationText: `订单提示：${word.chinese}`,
      word,
    }
  })
}

export const createCustomer = (
  id: number,
  forceBoss = false,
  wordPool: WordEntry[] = words,
): Customer => {
  const isBoss = forceBoss
  const maxPatience = isBoss ? bossPatience : basePatience
  const profile = customerProfiles[id % customerProfiles.length]
  const recipe = pickRecipe(id, isBoss)

  return {
    id,
    name: isBoss ? 'Boss 老板同学' : profile.name,
    avatar: isBoss ? 'boss' : profile.avatar,
    recipe,
    speech: isBoss ? pickLine(bossLines, id) : pickLine(idleLines, id),
    patience: maxPatience,
    maxPatience,
    stepIndex: 0,
    doneness: 0,
    firstSideDoneness: 0,
    secondSideDoneness: 0,
    pattySide: null,
    burn: 0,
    mistakes: 0,
    isBoss,
    steps: buildSteps(isBoss, wordPool, recipe),
  }
}

export const buildQuestion = (
  customer?: Customer,
): AnswerQuestion | undefined => {
  const step = customer?.steps[customer.stepIndex]

  if (!step) {
    return undefined
  }

  const options = [step.word.english, ...step.word.wrongOptions]
  const offset = (customer.id + customer.stepIndex) % options.length

  return {
    chinese: step.word.chinese,
    correctAnswer: step.word.english,
    options: [...options.slice(offset), ...options.slice(0, offset)],
  }
}
