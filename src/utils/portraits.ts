import { bossFinaleFrames, characterProfiles } from '../data/characters'
import type { BossFinaleFrameKey, CharacterProfile, Mood, PortraitFrameKey } from '../types/game'

const artVersion = '20260527-pixel-vn-v3'
const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path}?v=${artVersion}`

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
