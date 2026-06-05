import {
  basePatience,
  bossPatience,
  stepWordIds,
  targetRegularServed,
} from '../constants/game'
import { words, type WordEntry } from '../data/words'
import { customerRoster } from '../data/characters'
import type {
  AnswerQuestion,
  BurgerRecipe,
  BurgerStep,
  Customer,
  Mood,
  PattySide,
} from '../types/game'

type RecipeStepPlan = {
  layerId: string
  wordId: string
}

export const customerProfiles = customerRoster

const recipes: BurgerRecipe[] = [
  { id: 'classic', name: '细胞词根打底堡', tag: 'cell + tissue 稳住基本盘' },
  { id: 'green', name: '症状鉴别清醒堡', tag: 'symptom 别和 syndrome 互殴' },
  { id: 'tomato', name: '炎症红温冲刺堡', tag: 'inflammation 一口上头' },
  { id: 'sauce', name: '治疗护理封层堡', tag: 'treatment + nursing 盖住焦虑' },
  { id: 'vascular', name: '动脉心电蹦迪堡', tag: 'vital + artery 节律拉满' },
  { id: 'pharma', name: '药理抗生素爆酱堡', tag: 'dosage + antibiotic 精准给量' },
  { id: 'exam', name: '期末病理破防堡', tag: 'pathology + prognosis 背完再睡' },
  { id: 'immune', name: '免疫反应弹幕堡', tag: 'vaccine + benign 抗体开麦' },
  { id: 'ward', name: '查房病例速记堡', tag: 'diagnosis + treatment 现场追问' },
]

export const recipeCatalog = recipes

export const idleLines = [
  '同学，来一份能记住 medical terms 的汉堡，少放焦虑多放词根。',
  '我不怕排队，我怕 diagnosis 拼错后被全班沉默注视。',
  '快点快点，教材已经开始发热，PPT 也在偷偷加载。',
  '这家店怎么还查医学英语？离谱，但非常适合课程汇报。',
  '今天不背词根，明天病历翻译就背刺我。',
  '给我来个不焦的，最好能顺便治一下考前遗忘。',
  '我刚从自习室出来，脑子里只有 prefix 和一份热汉堡。',
  '请把 syndrome、symptom、sign 分开放，不然我会当场红温。',
  '这不是普通汉堡，这是医学英语词汇学临床技能训练。',
]

export const correctLines = [
  '可以，这个术语有医学味了，像刚消毒过。',
  '答对了，课堂笔记清清楚楚，老师眼神暂时放过你。',
  '这波像开了医学词根透视，前缀后缀都在发光。',
  '汉堡熟了，medical English 也熟了。',
  '啪！术语盖章成功，记忆神经元开始加班。',
  '答得漂亮，词根像心电图一样开始蹦迪。',
  '无菌命中！这个英文术语可以直接写进病历。',
]

export const wrongLines = [
  '啊？这个选项像把 symptom 当 syndrome 了，病历都愣住了。',
  '别乱点，我不是随机对照试验里的汉堡。',
  '我的教材沉默得像考前一晚的宿舍。',
  '这题错得很有课堂展示效果，但我的耐心正在退烧失败。',
  '术语错位警报：词根正在从锅里爬出来抗议。',
  '这个答案像把 benign 煎成 malignant，危险发言。',
  '错得很响，连隔壁解剖图谱都合上了。',
]

export const bossLines = [
  '医学英语教授来了，术语加压，耐心减半，眼镜反光增强。',
  '答错一次，我就追问词根、前缀、后缀，再追问为什么。',
  '让我看看谁是真正的医学英语词汇学选手。',
  '这份 Boss 订单要精准、无菌、还要有课堂汇报节目效果。',
  '请解释一下为什么 anti- 不是 auntie，课堂现在很安静。',
  '我不急，我只是把倒计时写进了病程记录。',
]

export const bossVictoryLines = [
  '教授表情失控：这份汉堡怎么把 terminology 和词根都讲明白了？',
  '全班认证：你把 Boss、词根和汉堡一起煎熟了。',
  '今日名场面：Medical Vocab Burger 课堂封神，病历翻译都鼓掌。',
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
    return 360 + Math.floor(Math.random() * 520)
  }

  const progress = Math.min(served / Math.max(1, targetRegularServed - 1), 1)
  const queueRelief = queueSize >= 2 ? 1200 : 0
  const baseDelay = Math.max(4300, 9200 - progress * 3900 + queueRelief)
  const randomWindow = Math.max(1800, 4300 - progress * 1900)

  return baseDelay + Math.floor(Math.random() * randomWindow)
}

export const getTargetQueueSize = () => 2

export const getPressureLabel = (
  served: number,
  queueSize: number,
  bossActive: boolean,
) => {
  if (bossActive) {
    return '教授眼镜反光'
  }

  if (queueSize === 0) {
    return '锅位空窗预警'
  }

  if (served >= 4) {
    return '下课前红温'
  }

  if (served >= 2) {
    return '候场加压期'
  }

  return '热身背词期'
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

export const getNextPattySide = (
  currentSide: PattySide,
  completedStepId: string,
): PattySide => {
  if (completedStepId === 'patty') {
    return 'first'
  }

  if (completedStepId === 'flip') {
    return 'second'
  }

  if (completedStepId === 'lettuce' && currentSide === 'second') {
    return 'done'
  }

  return currentSide
}

export const getCorrectFeedbackMessage = (
  stepId: string,
  isPerfectFlip: boolean,
  pattySide: PattySide,
) => {
  if (stepId === 'flip') {
    return isPerfectFlip
      ? '完美翻面！熟度刚刚好。'
      : '翻面成功，但熟度不是最佳窗口。'
  }

  if (stepId === 'lettuce' && pattySide === 'second') {
    return '肉饼出锅上堡！煎锅停止加热。'
  }

  return '答对了，动作完成！'
}

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

const baseStepPlans = (wordIds: string[]): RecipeStepPlan[] =>
  stepWordIds.map((layerId, index) => ({
    layerId,
    wordId: wordIds[index] ?? layerId,
  }))

const bossStepPlans: RecipeStepPlan[] = [
  { layerId: 'bun', wordId: 'anatomy' },
  { layerId: 'patty', wordId: 'physiology' },
  { layerId: 'flip', wordId: 'flip' },
  { layerId: 'lettuce', wordId: 'lettuce' },
  { layerId: 'tomato', wordId: 'pathology' },
  { layerId: 'sauce', wordId: 'antibiotic' },
  { layerId: 'perfect', wordId: 'perfect' },
]

const recipeStepPlans = (recipe: BurgerRecipe, isBoss: boolean) => {
  if (isBoss) {
    return bossStepPlans
  }

  const variants: Record<string, RecipeStepPlan[]> = {
    classic: baseStepPlans(['bun', 'patty', 'flip', 'anatomy', 'physiology', 'order']),
    green: baseStepPlans(['bun', 'patty', 'flip', 'lettuce', 'vital', 'sauce']),
    tomato: baseStepPlans(['bun', 'patty', 'flip', 'tomato', 'pathology', 'chronic']),
    sauce: baseStepPlans(['bun', 'patty', 'flip', 'dosage', 'serve', 'antibiotic']),
    vascular: baseStepPlans(['bun', 'artery', 'flip', 'vital', 'edema', 'prognosis']),
    pharma: baseStepPlans(['bun', 'patty', 'flip', 'vaccine', 'dosage', 'antibiotic']),
    exam: baseStepPlans(['anatomy', 'pathology', 'flip', 'fracture', 'malignant', 'benign']),
    immune: baseStepPlans(['immunity', 'antibody', 'flip', 'vaccine', 'benign', 'antibiotic']),
    ward: baseStepPlans(['emergency', 'patty', 'flip', 'diagnosis', 'treatment', 'prognosis']),
  }

  return variants[recipe.id] ?? baseStepPlans(stepWordIds)
}

const getUniqueQuizWords = (wordPool: WordEntry[]) => {
  const seenEnglish = new Set<string>()

  return wordPool.filter((word) => {
    const normalizedEnglish = word.english.trim().toLowerCase()

    if (!normalizedEnglish || seenEnglish.has(normalizedEnglish)) {
      return false
    }

    seenEnglish.add(normalizedEnglish)
    return true
  })
}

const wrapIndex = (index: number, length: number) =>
  ((index % length) + length) % length

const pickWordForStep = (
  plan: RecipeStepPlan,
  index: number,
  wordPool: WordEntry[],
  wordRotationSeed: number,
) => {
  const quizWords = getUniqueQuizWords(wordPool)

  if (quizWords.length > 0) {
    return quizWords[wrapIndex(wordRotationSeed + index, quizWords.length)]
  }

  return wordPool.find((entry) => entry.id === plan.wordId) ?? words[0]
}

export const buildSteps = (
  isBoss: boolean,
  wordPool: WordEntry[],
  recipe: BurgerRecipe,
  wordRotationSeed = 0,
): BurgerStep[] => {
  const plans = recipeStepPlans(recipe, isBoss)

  return plans.map((plan, index) => {
    const word = pickWordForStep(plan, index, wordPool, wordRotationSeed)
    const stepText: Record<string, { label: string; ingredient: string }> = {
      bun: { label: '放细胞词根底', ingredient: '细胞词根底' },
      patty: { label: '组织肉饼下锅开煎', ingredient: '肉饼下锅' },
      flip: { label: '答对诊断术语才能翻面', ingredient: '诊断翻面' },
      lettuce: { label: '肉饼出锅，加入症状生菜', ingredient: '出锅肉饼 + 症状生菜' },
      tomato: { label: '加入炎症番茄', ingredient: '炎症番茄' },
      sauce: { label: '挤治疗酱并盖上护理面包', ingredient: '治疗酱 + 护理面包盖' },
      perfect: { label: '喊出无菌完美汉堡', ingredient: 'Sterile Perfect Burger' },
    }

    return {
      id: plan.layerId === 'perfect' ? 'top' : plan.layerId,
      label: stepText[plan.layerId].label,
      ingredient: stepText[plan.layerId].ingredient,
      stationText: word.note
        ? `医学术语提示：${word.chinese}｜${word.note}`
        : `医学术语提示：${word.chinese}`,
      word,
    }
  })
}

export const createCustomer = (
  id: number,
  forceBoss = false,
  wordPool: WordEntry[] = words,
  profileIndex = id - 1,
  wordRotationOffset = 0,
): Customer => {
  const isBoss = forceBoss
  const maxPatience = isBoss ? bossPatience : basePatience
  const profile = customerProfiles[profileIndex % customerProfiles.length]
  const recipe = pickRecipe(id, isBoss)
  const wordRotationSeed = isBoss
    ? wordRotationOffset + targetRegularServed * stepWordIds.length
    : wordRotationOffset + Math.max(0, profileIndex) * stepWordIds.length

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
    steps: buildSteps(isBoss, wordPool, recipe, wordRotationSeed),
  }
}

export const buildQuestion = (
  customer?: Customer,
): AnswerQuestion | undefined => {
  const step = customer?.steps[customer.stepIndex]

  return buildQuestionFromStep(step, (customer?.id ?? 0) + (customer?.stepIndex ?? 0))
}

export const buildQuestionFromStep = (
  step?: BurgerStep,
  seed = 0,
): AnswerQuestion | undefined => {
  if (!step) {
    return undefined
  }

  const options = [step.word.english, ...step.word.wrongOptions]
  const offset = seed % options.length

  return {
    chinese: step.word.chinese,
    correctAnswer: step.word.english,
    options: [...options.slice(offset), ...options.slice(0, offset)],
  }
}
