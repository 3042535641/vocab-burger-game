import { bossFinaleFrames, characterProfiles } from '../data/characters'
import type { BossFinaleFrameKey, CharacterProfile, Mood, PortraitFrameKey } from '../types/game'

const artVersion = '20260604-roster-bun-clean-v2'
const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path}?v=${artVersion}`

const bossBattleFallbackFrames: Record<PortraitFrameKey, BossFinaleFrameKey> = {
  normal: 'entrance',
  waiting: 'entrance',
  worried: 'impact',
  angry: 'breakdown',
  reactionCloseup: 'bonk',
  satisfied: 'defeated',
}

export const getCharacterProfile = (
  avatar?: string,
  isBoss = false,
): CharacterProfile => {
  const id = isBoss ? 'boss' : avatar ?? 'round'

  return characterProfiles[id] ?? characterProfiles.round
}

export const getPortraitFrameKey = (
  mood: Mood,
  handoff = false,
): PortraitFrameKey => (handoff ? 'satisfied' : mood === 'happy' ? 'normal' : mood)

export const getStagePortraitFrameSrc = (
  avatar?: string,
  isBoss = false,
  frame: PortraitFrameKey = 'normal',
) => assetUrl(getCharacterProfile(avatar, isBoss).portraitFrames[frame])

export const getBossFinaleFrameSrc = (frame: BossFinaleFrameKey) =>
  assetUrl(bossFinaleFrames[frame])

export const getBossBattleFallbackFrameSrc = (frame: PortraitFrameKey) =>
  getBossFinaleFrameSrc(bossBattleFallbackFrames[frame])
