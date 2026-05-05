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
    chinese: '细胞',
    english: 'cell',
    wrongOptions: ['call', 'shell', 'sell'],
    category: 'food',
    difficulty: 1,
  },
  {
    id: 'patty',
    chinese: '组织',
    english: 'tissue',
    wrongOptions: ['issue', 'vessel', 'organ'],
    category: 'food',
    difficulty: 1,
  },
  {
    id: 'flip',
    chinese: '诊断',
    english: 'diagnosis',
    wrongOptions: ['prognosis', 'dose', 'dialogue'],
    category: 'action',
    difficulty: 3,
  },
  {
    id: 'lettuce',
    chinese: '症状',
    english: 'symptom',
    wrongOptions: ['syndrome', 'sample', 'system'],
    category: 'food',
    difficulty: 2,
  },
  {
    id: 'tomato',
    chinese: '炎症',
    english: 'inflammation',
    wrongOptions: ['infection', 'injection', 'infusion'],
    category: 'food',
    difficulty: 3,
  },
  {
    id: 'sauce',
    chinese: '治疗',
    english: 'treatment',
    wrongOptions: ['therapy', 'testing', 'training'],
    category: 'food',
    difficulty: 2,
  },
  {
    id: 'order',
    chinese: '术语',
    english: 'terminology',
    wrongOptions: ['technology', 'therapy', 'toxicology'],
    category: 'shop',
    difficulty: 3,
  },
  {
    id: 'customer',
    chinese: '医学生',
    english: 'medical student',
    wrongOptions: ['medical record', 'medicine store', 'middle school'],
    category: 'shop',
    difficulty: 2,
  },
  {
    id: 'angry',
    chinese: '急性的',
    english: 'acute',
    wrongOptions: ['chronic', 'active', 'actual'],
    category: 'feeling',
    difficulty: 2,
  },
  {
    id: 'perfect',
    chinese: '无菌的',
    english: 'sterile',
    wrongOptions: ['stable', 'systolic', 'sensitive'],
    category: 'feeling',
    difficulty: 3,
  },
  {
    id: 'hurry',
    chinese: '抢救',
    english: 'resuscitate',
    wrongOptions: ['rehabilitate', 'respirate', 'reassure'],
    category: 'action',
    difficulty: 3,
  },
  {
    id: 'serve',
    chinese: '护理',
    english: 'nursing',
    wrongOptions: ['nutrition', 'nausea', 'neuron'],
    category: 'action',
    difficulty: 2,
  },
]
