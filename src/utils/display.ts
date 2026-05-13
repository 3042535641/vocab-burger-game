import type { WordEntry } from '../data/words'

export const categoryLabels: Record<WordEntry['category'], string> = {
  food: '基础医学',
  action: '医学动作',
  shop: '课堂场景',
  feeling: '状态描述',
}

export const getServiceRank = (
  score: number,
  bestCombo: number,
  lostCustomers: number,
  bossDefeated: boolean,
) => {
  const penalty = lostCustomers * 80
  const bossBonus = bossDefeated ? 160 : 0
  const rankScore = score + bestCombo * 12 + bossBonus - penalty

  if (rankScore >= 760) {
    return {
      comment: '全班起立，医学英语汉堡之神，词根都排队敬礼。',
      label: 'SSS',
      tier: 'sss',
    }
  }

  if (rankScore >= 560) {
    return {
      comment: '术语、熟度、节奏都在线，像无菌操作一样稳。',
      label: 'S',
      tier: 's',
    }
  }

  if (rankScore >= 390) {
    return {
      comment: '课堂展示很稳，可以继续冲连击，把 PPT 都打出节拍。',
      label: 'A',
      tier: 'a',
    }
  }

  if (rankScore >= 240) {
    return {
      comment: '能开店，但教授的眼镜已经开始反光。',
      label: 'B',
      tier: 'b',
    }
  }

  return {
    comment: '建议先看预习词表，不然汉堡和术语会一起糊。',
    label: 'C',
    tier: 'c',
  }
}

export const formatPlayedAt = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '未知时间'
  }

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')

  return `${month}/${day} ${hour}:${minute}`
}
