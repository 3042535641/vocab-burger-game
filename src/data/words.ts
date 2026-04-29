export type WordQuestion = {
  word: string
  correctAnswer: string
  options: string[]
}

export const wordQuestions: WordQuestion[] = [
  {
    word: 'bottom bun',
    correctAnswer: '面包底',
    options: ['面包底', '奶酪片', '番茄片', '收银台'],
  },
  {
    word: 'patty',
    correctAnswer: '肉饼',
    options: ['肉饼', '生菜', '饮料', '菜单'],
  },
  {
    word: 'flip',
    correctAnswer: '翻面',
    options: ['结账', '翻面', '切碎', '等待'],
  },
  {
    word: 'lettuce',
    correctAnswer: '生菜',
    options: ['洋葱', '生菜', '薯条', '盘子'],
  },
  {
    word: 'sauce',
    correctAnswer: '酱汁',
    options: ['煎锅', '吸管', '酱汁', '柜台'],
  },
  {
    word: 'customer',
    correctAnswer: '顾客',
    options: ['顾客', '厨房', '订单', '零钱'],
  },
  {
    word: 'order',
    correctAnswer: '订单',
    options: ['围裙', '订单', '餐巾', '番茄酱'],
  },
]
