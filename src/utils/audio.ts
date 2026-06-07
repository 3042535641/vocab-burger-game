import type { AudioMode } from '../types/game'

const baseUrl = import.meta.env.BASE_URL
const audioVersion = '20260528-impact-funk'
const audioUrl = (fileName: string) =>
  `${baseUrl}audio/${fileName}?v=${audioVersion}`

const tracks: Record<Exclude<AudioMode, 'off'>, string> = {
  service: audioUrl('kitchen-groove.wav'),
  boss: audioUrl('boss-groove.wav'),
  finale: audioUrl('finale-groove.wav'),
}

const effects = {
  arrival: audioUrl('arrival.wav'),
  boss: audioUrl('boss.wav'),
  correct: audioUrl('correct.wav'),
  serve: audioUrl('serve.wav'),
  wrong: audioUrl('wrong.wav'),
}

type Tone = {
  delay?: number
  duration?: number
  frequency: number
  type?: OscillatorType
  volume?: number
  bendTo?: number
}

class GameAudio {
  private enabled = true
  private visible = true
  private leanMode = false
  private intensity = 0
  private mode: AudioMode = 'off'
  private context?: AudioContext
  private musicElements = new Map<Exclude<AudioMode, 'off'>, HTMLAudioElement>()
  private timers = new Set<number>()
  private pools = new Map<string, HTMLAudioElement[]>()

  private contextForEffects() {
    if (!this.context) {
      this.context = new AudioContext()
    }

    if (this.context.state === 'suspended') {
      void this.context.resume()
    }

    return this.context
  }

  private clearTimers() {
    this.timers.forEach((timer) => window.clearTimeout(timer))
    this.timers.clear()
  }

  private schedule(callback: () => void, delay = 0) {
    const limit = this.leanMode ? 8 : 16

    if (!this.enabled || !this.visible || this.timers.size >= limit) {
      return
    }

    const timer = window.setTimeout(() => {
      this.timers.delete(timer)

      if (this.enabled && this.visible) {
        callback()
      }
    }, delay)

    this.timers.add(timer)
  }

  private pooledAudio(src: string) {
    const pool = this.pools.get(src) ?? []
    const reusable = pool.find((audio) => audio.paused || audio.ended)

    if (reusable) {
      return reusable
    }

    if (pool.length >= (this.leanMode ? 2 : 3)) {
      pool[0].pause()
      return pool[0]
    }

    const audio = new Audio(src)
    audio.preload = 'auto'
    pool.push(audio)
    this.pools.set(src, pool)
    return audio
  }

  private oneShot(src: string, volume: number, playbackRate = 1, delay = 0) {
    this.schedule(() => {
      const audio = this.pooledAudio(src)
      audio.volume = volume
      audio.playbackRate = playbackRate
      audio.currentTime = 0
      void audio.play().catch(() => undefined)
    }, delay)
  }

  private tone({
    bendTo,
    delay = 0,
    duration = 0.08,
    frequency,
    type = 'square',
    volume = 0.04,
  }: Tone) {
    this.schedule(() => {
      const context = this.contextForEffects()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, now)
      if (bendTo) {
        oscillator.frequency.exponentialRampToValueAtTime(bendTo, now + duration)
      }
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + duration + 0.02)
    }, delay)
  }

  private sequence(items: Tone[]) {
    const source = this.leanMode ? items.filter((_, index) => index % 2 === 0) : items
    source.forEach((item) => this.tone(item))
  }

  private trackVolume(mode: AudioMode) {
    if (mode === 'finale') {
      return this.leanMode ? 0.4 : 0.64
    }
    if (mode === 'boss') {
      return this.leanMode ? 0.38 : 0.57
    }
    return (this.leanMode ? 0.27 : 0.42) + this.intensity * 0.08
  }

  private musicElement(mode: Exclude<AudioMode, 'off'>) {
    const cached = this.musicElements.get(mode)

    if (cached) {
      return cached
    }

    const audio = new Audio(tracks[mode])
    audio.loop = mode !== 'finale'
    audio.preload = 'auto'
    audio.volume = this.trackVolume(mode)
    this.musicElements.set(mode, audio)
    return audio
  }

  private stopMusicSource(reset = false) {
    this.musicElements.forEach((audio) => {
      audio.pause()
      if (reset) {
        audio.currentTime = 0
      }
    })
  }

  private switchTrack(mode: AudioMode) {
    if (!this.enabled) {
      this.mode = 'off'
      this.stopMusicSource()
      return
    }

    if (mode === this.mode && mode !== 'off') {
      const current = this.musicElement(mode)
      current.volume = this.trackVolume(mode)

      if (this.enabled && this.visible && current.paused) {
        void current.play().catch(() => undefined)
      }

      return
    }

    this.stopMusicSource()
    this.mode = mode

    if (mode === 'off' || !this.visible) {
      return
    }

    const audio = this.musicElement(mode)
    audio.currentTime = 0
    audio.volume = this.trackVolume(mode)
    void audio.play().catch(() => undefined)
  }

  preload() {
    Object.keys(tracks).forEach((mode) => {
      this.musicElement(mode as Exclude<AudioMode, 'off'>).load()
    })
    Object.values(effects).forEach((src) => {
      const audio = this.pooledAudio(src)
      audio.load()
    })
  }

  unlock() {
    this.preload()
    if (!this.context) {
      this.context = new AudioContext()
    }
    if (this.context.state === 'suspended') {
      void this.context.resume()
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) {
      this.stopMusic()
      this.pools.forEach((pool) =>
        pool.forEach((audio) => {
          audio.pause()
          audio.currentTime = 0
        }),
      )
      return
    }

    this.preload()
  }

  setPerformanceMode(enabled: boolean) {
    this.leanMode = enabled
    if (this.mode !== 'off') {
      this.musicElement(this.mode).volume = this.trackVolume(this.mode)
    }
  }

  setPageVisible(visible: boolean) {
    this.visible = visible
    if (!visible) {
      this.clearTimers()
      this.stopMusicSource()
      return
    }

    if (this.enabled && this.mode !== 'off') {
      this.switchTrack(this.mode)
    }
  }

  setIntensity(level: number) {
    this.intensity = Math.max(0, Math.min(1, level))
    if (this.mode === 'service') {
      this.musicElement(this.mode).volume = this.trackVolume(this.mode)
    }
  }

  startMusic() {
    this.switchTrack('service')
  }

  stopNormalMusic() {
    if (this.mode === 'service') {
      this.switchTrack('off')
    }
  }

  startBossMusic() {
    this.switchTrack('boss')
  }

  stopBossMusic() {
    if (this.mode === 'boss') {
      this.switchTrack('off')
    }
  }

  stopMusic() {
    this.clearTimers()
    this.stopMusicSource(true)
    this.mode = 'off'
    this.intensity = 0
  }

  playCorrect(combo = 1) {
    const level = Math.min(combo, 8)
    this.oneShot(effects.correct, 0.62, 1 + level * 0.03)
    this.sequence([
      { frequency: 560 + level * 36, duration: 0.055, volume: 0.035 },
      { delay: 55, frequency: 840 + level * 45, duration: 0.05, volume: 0.028 },
      ...(combo >= 3
        ? [{ delay: 112, frequency: 1320 + level * 30, duration: 0.06, volume: 0.03 }]
        : []),
    ])
  }

  playWrong(isBoss = false) {
    this.oneShot(effects.wrong, 0.7, isBoss ? 0.83 : 0.92)
    this.sequence([
      { frequency: isBoss ? 170 : 220, bendTo: 72, duration: 0.18, type: 'sawtooth', volume: 0.045 },
      { delay: 100, frequency: 110, bendTo: 55, duration: 0.12, type: 'square', volume: 0.028 },
    ])
  }

  playServe(perfect = false) {
    this.oneShot(effects.serve, 0.72, perfect ? 1.12 : 1)
    this.sequence([
      { frequency: 392, duration: 0.06, volume: 0.03 },
      { delay: 70, frequency: 587, duration: 0.06, volume: 0.034 },
      { delay: 145, frequency: perfect ? 1175 : 784, duration: 0.1, volume: 0.036 },
    ])
  }

  playArrival() {
    this.oneShot(effects.arrival, 0.52)
    this.sequence([
      { frequency: 523, duration: 0.05, volume: 0.025 },
      { delay: 62, frequency: 784, duration: 0.06, volume: 0.024 },
    ])
  }

  playBoss() {
    this.oneShot(effects.boss, 0.74)
    this.sequence([
      { frequency: 82, bendTo: 41, duration: 0.24, type: 'sawtooth', volume: 0.05 },
      { delay: 150, frequency: 740, duration: 0.075, volume: 0.033 },
    ])
  }

  playVictory() {
    this.clearTimers()
    this.switchTrack('finale')
    this.oneShot(effects.serve, 0.86, 0.88)
    this.sequence([
      { frequency: 196, bendTo: 392, duration: 0.14, type: 'sawtooth', volume: 0.04 },
      { delay: 1200, frequency: 110, bendTo: 55, duration: 0.2, type: 'square', volume: 0.05 },
      { delay: 3000, frequency: 156, bendTo: 78, duration: 0.2, type: 'sawtooth', volume: 0.05 },
      { delay: 5600, frequency: 65, bendTo: 32, duration: 0.28, type: 'square', volume: 0.07 },
      { delay: 7600, frequency: 523, duration: 0.11, volume: 0.035 },
      { delay: 7720, frequency: 784, duration: 0.11, volume: 0.038 },
      { delay: 7840, frequency: 1046, duration: 0.17, volume: 0.04 },
    ])
    this.oneShot(effects.wrong, 0.28, 0.76, 1200)
    this.oneShot(effects.wrong, 0.32, 0.68, 3000)
    this.oneShot(effects.serve, 0.94, 0.68, 5600)
    this.oneShot(effects.correct, 0.62, 1.25, 7600)
  }
}

export const gameAudio = new GameAudio()
