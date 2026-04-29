export type WordEntry = {
  id: string
  chinese: string
  english: string
  wrongOptions: string[]
  category: 'food' | 'action' | 'shop' | 'feeling'
  difficulty: 1 | 2 | 3
}

export const words: WordEntry[] = [
  {
    id: 'bun',
    chinese: '面包',
    english: 'bun',
    wrongOptions: ['pan', 'bowl', 'rice'],
    category: 'food',
    difficulty: 1,
  },
  {
    id: 'patty',
    chinese: '肉饼',
    english: 'patty',
    wrongOptions: ['party', 'plate', 'potato'],
    category: 'food',
    difficulty: 1,
  },
  {
    id: 'flip',
    chinese: '翻面',
    english: 'flip',
    wrongOptions: ['fill', 'fall', 'fold'],
    category: 'action',
    difficulty: 2,
  },
  {
    id: 'lettuce',
    chinese: '生菜',
    english: 'lettuce',
    wrongOptions: ['tomato', 'cheese', 'onion'],
    category: 'food',
    difficulty: 1,
  },
  {
    id: 'tomato',
    chinese: '番茄',
    english: 'tomato',
    wrongOptions: ['potato', 'carrot', 'pepper'],
    category: 'food',
    difficulty: 1,
  },
  {
    id: 'sauce',
    chinese: '酱汁',
    english: 'sauce',
    wrongOptions: ['soup', 'salt', 'salad'],
    category: 'food',
    difficulty: 1,
  },
  {
    id: 'order',
    chinese: '订单',
    english: 'order',
    wrongOptions: ['offer', 'owner', 'oven'],
    category: 'shop',
    difficulty: 2,
  },
  {
    id: 'customer',
    chinese: '顾客',
    english: 'customer',
    wrongOptions: ['cashier', 'cook', 'teacher'],
    category: 'shop',
    difficulty: 2,
  },
  {
    id: 'angry',
    chinese: '生气的',
    english: 'angry',
    wrongOptions: ['hungry', 'happy', 'early'],
    category: 'feeling',
    difficulty: 1,
  },
  {
    id: 'perfect',
    chinese: '完美的',
    english: 'perfect',
    wrongOptions: ['patient', 'popular', 'purple'],
    category: 'feeling',
    difficulty: 2,
  },
  {
    id: 'hurry',
    chinese: '赶快',
    english: 'hurry',
    wrongOptions: ['hungry', 'heavy', 'history'],
    category: 'action',
    difficulty: 2,
  },
  {
    id: 'serve',
    chinese: '服务；上菜',
    english: 'serve',
    wrongOptions: ['save', 'share', 'slice'],
    category: 'action',
    difficulty: 3,
  },
]
