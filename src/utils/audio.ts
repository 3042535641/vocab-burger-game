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
      const audio = new Audio(src)
      audio.volume = volume
      audio.playbackRate = playbackRate
      void audio.play().catch(() => undefined)
    }, delay)
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

  startBossMusic() {
    this.finaleActive = false
    this.bossActive = true
    this.startMusic()

    if (!this.bossMusic) {
      this.bossMusic = new Audio(audioFiles.boss)
      this.bossMusic.loop = true
    }

    this.bossMusic.volume = 0.48
    this.bossMusic.playbackRate = 0.78
    void this.bossMusic.play().catch(() => undefined)

    if (this.music) {
      this.music.volume = 0.06
      this.music.playbackRate = 0.9
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

    if (combo >= 3) {
      this.playOneShot(audioFiles.correct, 0.42, 1.18, 70)
      this.playTone(880, 0.08, 'triangle', 0.04, 75)
    }
  }

  playWrong(isBoss = false) {
    this.playOneShot(audioFiles.wrong, 0.78, isBoss ? 0.86 : 0.92)
    this.playOneShot(audioFiles.wrong, 0.34, 0.72, 90)
    this.playTone(isBoss ? 110 : 146, 0.14, 'sawtooth', 0.05)
  }

  playServe(isPerfect = false) {
    this.playOneShot(audioFiles.serve, 0.82, 1)
    this.playTone(523, 0.06, 'square', 0.035)
    this.playTone(784, 0.08, 'square', 0.04, 75)

    if (isPerfect) {
      this.playOneShot(audioFiles.correct, 0.5, 1.22, 120)
      this.playTone(1046, 0.1, 'triangle', 0.045, 140)
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
  }

  playVictory() {
    this.finaleActive = true
    this.stopBossMusic()
    this.setIntensity(0)
    this.playOneShot(audioFiles.serve, 0.86, 1.04)
    this.playOneShot(audioFiles.correct, 0.58, 1.24, 120)
    this.playOneShot(audioFiles.boss, 0.38, 1.18, 260)
    this.playTone(523, 0.1, 'square', 0.05)
    this.playTone(659, 0.1, 'square', 0.05, 90)
    this.playTone(784, 0.12, 'triangle', 0.05, 180)
    this.playTone(1046, 0.16, 'triangle', 0.055, 320)

    for (let delay = 3600; delay <= 16000; delay += 4200) {
      this.playOneShot(audioFiles.correct, 0.34, 1.12, delay)
      this.playTone(392, 0.12, 'square', 0.035, delay + 80)
      this.playTone(523, 0.12, 'square', 0.035, delay + 220)
      this.playTone(659, 0.16, 'triangle', 0.04, delay + 380)
    }
  }

  startMusic() {
    if (!this.music) {
      this.music = new Audio(audioFiles.music)
      this.music.loop = true
      this.music.volume = 0.2
      this.music.playbackRate = 0.96
    }

    void this.music.play().catch(() => undefined)
  }

  stopMusic() {
    this.finaleActive = false
    this.clearScheduledEffects()

    if (!this.music) {
      this.stopBossMusic()
      return
    }

    this.stopBossMusic()
    this.music.pause()
    this.music.currentTime = 0
    this.music.playbackRate = 1
    this.setIntensity(0)

  }
}

export const gameAudio = new GameAudio()
