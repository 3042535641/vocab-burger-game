export type GameRecords = {
  highScore: number
  bestCombo: number
  wins: number
  rounds: number
  history: Array<{
    score: number
    bestCombo: number
    servedCount: number
    bossDefeated: boolean
    playedAt: string
  }>
}

export const defaultRecords: GameRecords = {
  highScore: 0,
  bestCombo: 0,
  wins: 0,
  rounds: 0,
  history: [],
}
