import {
  basePatience,
  bossPatience,
  bossStepWordIds,
  stepWordIds,
  targetRegularServed,
} from '../constants/game'
import { words, type WordEntry } from '../data/words'
import type {
  AnswerQuestion,
  BurgerRecipe,
  BurgerStep,
  Customer,
  Mood,
} from '../types/game'

export const customerProfiles = [
  { name: '医学生小明', avatar: 'round' },
  { name: '背词王安娜', avatar: 'star' },
  { name: '解剖课 Leo', avatar: 'cap' },
  { name: '护理专业糖糖', avatar: 'bow' },
  { name: '药理课阿杰', avatar: 'shade' },
  { name: '实验课 Mia', avatar: 'bun' },
]

const recipes: BurgerRecipe[] = [
  { id: 'classic', name: '基础解剖词根堡', tag: 'cell + tissue 打底' },
  { id: 'green', name: '症状识别清爽堡', tag: 'symptom 快速识别' },
  { id: 'tomato', name: '炎症反应冲刺堡', tag: 'inflammation 加压' },
  { id: 'sauce', name: '治疗护理记忆堡', tag: 'treatment + nursing' },
]

export const recipeCatalog = recipes

export const idleLines = [
  '同学，来一份能记住 medical terms 的汉堡。',
  '我不怕排队，我怕 diagnosis 拼错。',
  '快点快点，教材已经开始发热了。',
  '这家店怎么还查医学英语？离谱但很适合汇报。',
]

export const correctLines = [
  '可以，这个术语有医学味了。',
  '答对了，课堂笔记清清楚楚。',
  '这波像开了医学词根透视。',
  '汉堡熟了，medical English 也熟了。',
]

export const wrongLines = [
  '啊？这个选项像把 symptom 当 syndrome 了。',
  '别乱点，我不是随机对照试验里的汉堡。',
  '我的教材沉默得像考前一晚。',
  '这题错得很有课堂展示效果。',
]

export const bossLines = [
  '医学英语教授来了，术语加压，耐心减半。',
  '答错一次，我就追问词根、前缀、后缀。',
  '让我看看谁是真正的医学英语词汇学选手。',
]

export const bossVictoryLines = [
  '教授破防：这份汉堡怎么把 terminology 和词根都讲明白了？',
  '全班认证：你把 Boss、词根和汉堡一起煎熟了。',
  '今日名场面：Medical Vocab Burger 课堂封神。',
]

export const pickLine = (lines: string[], seed: number) =>
  lines[seed % lines.length]

export const getWaitedSeconds = (customer: Customer) =>
  customer.maxPatience - customer.patience

export const getCustomerMood = (customer: Customer): Mood => {
  const waitedSeconds = getWaitedSeconds(customer)

  if (customer.patience <= 12) {
    return 'angry'
  }

  if (waitedSeconds >= 20) {
    return 'worried'
  }

  if (waitedSeconds >= 10) {
    return 'waiting'
  }

  return 'happy'
}

export const getUrgencyLabel = (customer: Customer) => {
  const waitedSeconds = getWaitedSeconds(customer)

  if (customer.patience <= 12) {
    return '快生气了'
  }

  if (waitedSeconds >= 20) {
    return '20 秒着急'
  }

  if (waitedSeconds >= 10) {
    return '开始催单'
  }

  return '刚到店'
}

export const pickRecipe = (id: number, isBoss: boolean) =>
  isBoss
    ? { id: 'boss', name: '教授终极术语堡', tag: '全术语加压' }
    : recipes[id % recipes.length]

export const getWaitingLine = (customer: Customer) => {
  const waitedSeconds = getWaitedSeconds(customer)

  if (customer.isBoss) {
    return waitedSeconds >= 20
      ? '教授：20 秒了，还没出餐？我要追问词源了。'
      : customer.speech
  }

  if (customer.patience <= 12) {
    return '再不出餐，我就把教材目录背下来催单。'
  }

  if (waitedSeconds >= 20) {
    return '我已经等 20 秒了，cell 和 sell 都快混了。'
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
      bun: { label: '放细胞词根底', ingredient: '细胞词根底' },
      patty: { label: '放组织肉饼开始煎', ingredient: '组织肉饼' },
      flip: { label: '答对诊断术语才能翻面', ingredient: '诊断翻面' },
      lettuce: { label: '加入症状生菜', ingredient: '症状生菜' },
      tomato: { label: '加入炎症番茄', ingredient: '炎症番茄' },
      sauce: { label: '挤治疗酱并盖上护理面包', ingredient: '治疗酱 + 护理面包盖' },
      perfect: { label: '喊出无菌完美汉堡', ingredient: 'Sterile Perfect Burger' },
    }

    return {
      id: wordId === 'perfect' ? 'top' : wordId,
      label: stepText[wordId].label,
      ingredient: stepText[wordId].ingredient,
      stationText: `医学术语提示：${word.chinese}`,
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
    name: isBoss ? '医学英语教授 Boss' : profile.name,
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
