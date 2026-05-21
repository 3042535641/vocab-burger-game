import type { Mood } from '../types/game'

const portraitIds = new Set(['round', 'star', 'cap', 'bow', 'shade', 'bun', 'boss'])

const pixelPortraits: Record<string, string> = {
  boss: 'professor-boss.png',
  bow: 'nursing-watch.png',
  bun: 'lab-report.png',
  cap: 'anatomy-crammer.png',
  round: 'early-crammer.png',
  shade: 'pharma-spark.png',
  star: 'vocab-ace.png',
}

const safeMoodFrame: Record<string, Record<Mood, string>> = {
  boss: {
    angry: 'boss-angry.png',
    happy: 'boss-happy.png',
    waiting: 'boss-waiting.png',
    worried: 'boss-worried.png',
  },
  bow: {
    angry: 'bow-angry.png',
    happy: 'bow-happy.png',
    waiting: 'bow-waiting.png',
    worried: 'bow-worried.png',
  },
  bun: {
    angry: 'bun-angry.png',
    happy: 'bun-happy.png',
    waiting: 'bun-waiting.png',
    worried: 'bun-worried.png',
  },
  cap: {
    angry: 'cap-angry.png',
    happy: 'cap-happy.png',
    waiting: 'cap-waiting.png',
    worried: 'cap-worried.png',
  },
  round: {
    angry: 'round-angry.png',
    happy: 'round-happy.png',
    waiting: 'round-waiting.png',
    worried: 'round-worried.png',
  },
  shade: {
    angry: 'shade-angry.png',
    happy: 'shade-happy.png',
    waiting: 'shade-waiting.png',
    worried: 'shade-worried.png',
  },
  star: {
    angry: 'star-angry.png',
    happy: 'star-happy.png',
    waiting: 'star-waiting.png',
    worried: 'star-worried.png',
  },
}

const artVersion = '20260521-vn-frame-clean'

const resolvePortraitId = (avatar?: string, isBoss = false) =>
  isBoss ? 'boss' : portraitIds.has(avatar ?? '') ? (avatar ?? 'round') : 'round'

export const getPortraitHref = (avatar?: string, isBoss = false) => {
  const id = resolvePortraitId(avatar, isBoss)
  return `${import.meta.env.BASE_URL}art/vn-portraits.svg#portrait-${id}`
}

export const getPixelPortraitSrc = (avatar?: string, isBoss = false) => {
  const id = resolvePortraitId(avatar, isBoss)
  const fileName = pixelPortraits[id] ?? pixelPortraits.round

  return `${import.meta.env.BASE_URL}art/pixel-characters/${fileName}?v=${artVersion}`
}

export const getPixelPortraitFrameSrc = (
  avatar?: string,
  isBoss = false,
  mood: Mood = 'happy',
) => {
  const id = resolvePortraitId(avatar, isBoss)
  const fileName = safeMoodFrame[id]?.[mood] ?? safeMoodFrame.round.happy

  return `${import.meta.env.BASE_URL}art/pixel-characters/frames/${fileName}?v=${artVersion}`
}
