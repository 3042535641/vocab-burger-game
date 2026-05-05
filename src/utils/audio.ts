const baseUrl = import.meta.env.BASE_URL

const audioFiles = {
  arrival: `${baseUrl}audio/arrival.wav`,
  boss: `${baseUrl}audio/boss.wav`,
  correct: `${baseUrl}audio/correct.wav`,
  music: `${baseUrl}audio/bgm.wav`,
  serve: `${baseUrl}audio/serve.wav`,
  wrong: `${baseUrl}audio/wrong.wav`,
}

class GameAudio {
  private music?: HTMLAudioElement
  private bossMusic?: HTMLAudioElement
  private audioContext?: AudioContext
  private intensity = 0
  private bossActive = false
  private finaleActive = false
  private effectTimers = new Set<number>()
  private oneShotPools = new Map<string, HTMLAudioElement[]>()
  private grooveTimer?: number
  private grooveStep = 0

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume()
    }

    return this.audioContext
  }

  private scheduleEffect(callback: () => void, delay = 0) {
    const timer = window.setTimeout(() => {
      this.effectTimers.delete(timer)
      callback()
    }, delay)

    this.effectTimers.add(timer)
  }

  private clearScheduledEffects() {
    for (const timer of this.effectTimers) {
      window.clearTimeout(timer)
    }

    this.effectTimers.clear()
  }

  private playOneShot(src: string, volume = 0.7, playbackRate = 1, delay = 0) {
    this.scheduleEffect(() => {
      const audio = this.getPooledAudio(src)
      audio.volume = volume
      audio.playbackRate = playbackRate
      audio.currentTime = 0
      void audio.play().catch(() => undefined)
    }, delay)
  }

  private getPooledAudio(src: string) {
    const pool = this.oneShotPools.get(src) ?? []
    const available = pool.find((audio) => audio.paused || audio.ended)

    if (available) {
      return available
    }

    if (pool.length >= 4) {
      pool[0].pause()
      return pool[0]
    }

    const audio = new Audio(src)
    audio.preload = 'auto'
    pool.push(audio)
    this.oneShotPools.set(src, pool)
    return audio
  }

  private playTone(
    frequency: number,
    duration = 0.08,
    type: OscillatorType = 'square',
    volume = 0.055,
    delay = 0,
  ) {
    this.scheduleEffect(() => {
      const context = this.getAudioContext()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + duration + 0.02)
    }, delay)
  }

  private playDirectTone(
    frequency: number,
    duration = 0.08,
    type: OscillatorType = 'square',
    volume = 0.04,
    bendTo?: number,
  ) {
    const context = this.getAudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)

    if (bendTo) {
      oscillator.frequency.exponentialRampToValueAtTime(bendTo, now + duration)
    }

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }

  private startGroove() {
    if (this.grooveTimer) {
      return
    }

    const normalLead = [523, 659, 784, 659, 880, 784, 659, 587]
    const normalBass = [130, 130, 164, 130, 196, 164, 146, 130]
    const bossLead = [196, 185, 146, 185, 220, 185, 146, 123]
    const bossBass = [65, 61, 55, 61, 49, 55, 61, 65]

    this.grooveTimer = window.setInterval(() => {
      if (this.finaleActive) {
        return
      }

      const step = this.grooveStep
      const leadPattern = this.bossActive ? bossLead : normalLead
      const bassPattern = this.bossActive ? bossBass : normalBass
      const lead = leadPattern[step % leadPattern.length]
      const bass = bassPattern[step % bassPattern.length]
      const hype = 1 + this.intensity * 0.45

      this.playDirectTone(
        lead,
        this.bossActive ? 0.12 : 0.09,
        this.bossActive ? 'sawtooth' : 'square',
        (this.bossActive ? 0.024 : 0.032) * hype,
        this.bossActive ? lead * 0.74 : lead * 1.22,
      )

      if (step % 2 === 0) {
        this.playDirectTone(
          bass,
          this.bossActive ? 0.16 : 0.1,
          'triangle',
          (this.bossActive ? 0.035 : 0.026) * hype,
          this.bossActive ? bass * 0.82 : undefined,
        )
      }

      if (!this.bossActive && step % 4 === 3) {
        this.playDirectTone(1046, 0.06, 'square', 0.02 * hype, 1318)
      }

      if (this.bossActive && step % 4 === 1) {
        this.playDirectTone(92, 0.18, 'sawtooth', 0.026, 55)
      }

      this.grooveStep += 1
    }, 900)
  }

  private stopGroove() {
    if (!this.grooveTimer) {
      return
    }

    window.clearInterval(this.grooveTimer)
    this.grooveTimer = undefined
    this.grooveStep = 0
  }

  private playFinaleGroove() {
    const bassPattern = [98, 49, 98, 65, 123, 65, 98, 73]
    const chantPattern = [784, 988, 1175, 988, 1568, 1175, 988, 784]
    const sirenPattern = [392, 523, 659, 784, 1046, 784, 659, 523]
    const slamDelays = [0, 420, 840, 1680, 2520, 3360, 5040, 6720, 8400]

    slamDelays.forEach((delay, index) => {
      const heavy = index === 0 || index % 3 === 0

      this.playOneShot(audioFiles.serve, heavy ? 0.88 : 0.48, heavy ? 0.82 : 0.94, delay)
      this.playOneShot(audioFiles.wrong, heavy ? 0.22 : 0.12, 0.66, delay + 28)
      this.playTone(73, heavy ? 0.24 : 0.15, 'sawtooth', heavy ? 0.068 : 0.045, delay)
      this.playTone(146, 0.08, 'square', 0.036, delay + 42)
    })

    for (let index = 0; index < 38; index += 1) {
      const delay = 760 + index * 210
      const bass = bassPattern[index % bassPattern.length]
      const chant = chantPattern[index % chantPattern.length]
      const siren = sirenPattern[index % sirenPattern.length]
      const strongBeat = index % 4 === 0
      const offBeat = index % 4 === 2

      this.playTone(
        bass,
        strongBeat ? 0.18 : 0.1,
        'sawtooth',
        strongBeat ? 0.052 : 0.034,
        delay,
      )

      this.playTone(
        chant,
        0.065,
        index % 2 === 0 ? 'square' : 'triangle',
        offBeat ? 0.048 : 0.034,
        delay + 74,
      )

      if (offBeat) {
        this.playTone(chant * 1.5, 0.045, 'square', 0.026, delay + 124)
        this.playTone(siren, 0.09, 'sawtooth', 0.024, delay + 168)
      }

      if (index % 8 === 7) {
        this.playOneShot(audioFiles.correct, 0.34, 1.3, delay + 30)
        this.playTone(1760, 0.06, 'square', 0.032, delay + 120)
        this.playTone(2093, 0.06, 'square', 0.026, delay + 190)
      }
    }

    const lectureGliss = [1046, 988, 1175, 784, 1568, 740, 1760, 659, 2093]

    lectureGliss.forEach((frequency, index) => {
      const delay = 1180 + index * 105
      const target = index % 2 === 0 ? frequency * 0.58 : frequency * 1.35

      this.playTone(
        frequency,
        0.075,
        index % 3 === 0 ? 'sawtooth' : 'square',
        0.034,
        delay,
      )
      this.playTone(target, 0.045, 'triangle', 0.022, delay + 52)
    })
  }

  setIntensity(level: number) {
    this.intensity = Math.max(0, Math.min(1, level))

    if (this.music) {
      this.music.volume = this.finaleActive
        ? 0.08
        : this.bossActive
          ? 0.06
          : 0.2 + this.intensity * 0.05
      this.music.playbackRate = this.finaleActive
        ? 0.92
        : this.bossActive
          ? 0.9
          : 0.96 + this.intensity * 0.02
    }

  }

  stopNormalMusic() {
    if (!this.music) {
      return
    }

    this.music.pause()
    this.music.currentTime = 0
    this.music.volume = 0.2
    this.music.playbackRate = 1
  }

  startBossMusic() {
    this.finaleActive = false
    this.bossActive = true
    this.stopNormalMusic()
    this.startGroove()

    if (!this.bossMusic) {
      this.bossMusic = new Audio(audioFiles.boss)
      this.bossMusic.loop = true
    }

    this.bossMusic.volume = 0.48
    this.bossMusic.playbackRate = 0.78
    void this.bossMusic.play().catch(() => undefined)

    if (this.music) {
      this.music.volume = 0.04
      this.music.playbackRate = 0.86
    }

  }

  stopBossMusic() {
    this.bossActive = false

    if (this.bossMusic) {
      this.bossMusic.pause()
      this.bossMusic.currentTime = 0
      this.bossMusic.playbackRate = 1
    }

    this.setIntensity(this.intensity)
  }

  playCorrect(combo = 1) {
    this.playOneShot(audioFiles.correct, 0.72, 1 + Math.min(combo, 8) * 0.025)
    this.playTone(660 + Math.min(combo, 8) * 32, 0.07, 'square', 0.045)
    this.playTone(990 + Math.min(combo, 8) * 36, 0.045, 'square', 0.026, 45)

    if (combo >= 3) {
      this.playOneShot(audioFiles.correct, 0.42, 1.18, 70)
      this.playTone(880, 0.08, 'triangle', 0.04, 75)
      this.playTone(1320, 0.055, 'square', 0.03, 135)
    }
  }

  playWrong(isBoss = false) {
    this.playOneShot(audioFiles.wrong, 0.78, isBoss ? 0.86 : 0.92)
    this.playOneShot(audioFiles.wrong, 0.34, 0.72, 90)
    this.playTone(isBoss ? 110 : 146, 0.14, 'sawtooth', 0.05)
    this.playTone(isBoss ? 82 : 98, 0.12, 'square', 0.032, 90)
  }

  playServe(isPerfect = false) {
    this.playOneShot(audioFiles.serve, 0.82, 1)
    this.playTone(523, 0.06, 'square', 0.035)
    this.playTone(784, 0.08, 'square', 0.04, 75)
    this.playTone(1046, 0.06, 'triangle', 0.03, 150)

    if (isPerfect) {
      this.playOneShot(audioFiles.correct, 0.5, 1.22, 120)
      this.playTone(1046, 0.1, 'triangle', 0.045, 140)
      this.playTone(1568, 0.1, 'square', 0.034, 240)
    }
  }

  playArrival() {
    this.playOneShot(audioFiles.arrival, 0.6)
    this.playTone(392, 0.08, 'square', 0.03)
  }

  playBoss() {
    this.playOneShot(audioFiles.boss, 0.8)
    this.playOneShot(audioFiles.wrong, 0.36, 0.76, 160)
    this.playTone(82, 0.22, 'sawtooth', 0.055)
    this.playTone(164, 0.16, 'sawtooth', 0.04, 120)
    this.playTone(61, 0.2, 'square', 0.034, 260)
  }

  playVictory() {
    this.finaleActive = true
    this.clearScheduledEffects()
    this.stopNormalMusic()
    this.stopBossMusic()
    this.stopGroove()
    this.setIntensity(0)
    this.playOneShot(audioFiles.serve, 0.96, 0.86)
    this.playOneShot(audioFiles.correct, 0.72, 1.28, 120)
    this.playOneShot(audioFiles.boss, 0.52, 1.22, 260)
    this.playTone(196, 0.18, 'sawtooth', 0.052, 0)
    this.playTone(392, 0.16, 'square', 0.048, 110)
    this.playTone(784, 0.14, 'square', 0.046, 220)
    this.playTone(1175, 0.15, 'triangle', 0.044, 330)
    this.playTone(1568, 0.18, 'square', 0.044, 460)
    this.playTone(2093, 0.24, 'sine', 0.05, 620)
    this.playFinaleGroove()

    for (let delay = 1800; delay <= 8400; delay += 1400) {
      this.playOneShot(audioFiles.correct, 0.36, 1.22, delay)
      this.playTone(523, 0.1, 'triangle', 0.032, delay + 60)
      this.playTone(880, 0.11, 'square', 0.036, delay + 170)
      this.playTone(1318, 0.13, 'square', 0.034, delay + 300)
    }
  }

  startMusic() {
    this.finaleActive = false
    this.bossActive = false

    if (!this.music) {
      this.music = new Audio(audioFiles.music)
      this.music.loop = true
      this.music.volume = 0.2
      this.music.playbackRate = 0.96
    }

    void this.music.play().catch(() => undefined)
    this.startGroove()
  }

  stopMusic() {
    this.finaleActive = false
    this.clearScheduledEffects()
    this.stopBossMusic()

    if (!this.music) {
      this.setIntensity(0)
      this.stopGroove()
      return
    }

    this.music.pause()
    this.music.currentTime = 0
    this.music.playbackRate = 1
    this.setIntensity(0)
    this.stopGroove()

  }
}

export const gameAudio = new GameAudio()
