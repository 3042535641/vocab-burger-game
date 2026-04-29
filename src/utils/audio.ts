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
  private audioContext?: AudioContext
  private arcadeGain?: GainNode
  private arcadeTimer?: number
  private bossGain?: GainNode
  private bossTimer?: number
  private bossStep = 0
  private arcadeStep = 0
  private intensity = 0

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.arcadeGain = this.audioContext.createGain()
      this.arcadeGain.gain.value = 0.032
      this.arcadeGain.connect(this.audioContext.destination)
      this.bossGain = this.audioContext.createGain()
      this.bossGain.gain.value = 0
      this.bossGain.connect(this.audioContext.destination)
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume()
    }

    return this.audioContext
  }

  private playOneShot(src: string, volume = 0.7, playbackRate = 1, delay = 0) {
    window.setTimeout(() => {
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
    window.setTimeout(() => {
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

  private startArcadeLayer() {
    if (this.arcadeTimer) {
      return
    }

    const melody = [330, 392, 440, 392, 494, 440, 392, 330]
    const bass = [82, 82, 98, 82, 110, 98, 82, 73]

    this.getAudioContext()
    this.arcadeTimer = window.setInterval(() => {
      const context = this.getAudioContext()
      const gain = this.arcadeGain

      if (!gain) {
        return
      }

      const now = context.currentTime
      const lead = context.createOscillator()
      const leadGain = context.createGain()
      const kick = context.createOscillator()
      const kickGain = context.createGain()
      const note = melody[this.arcadeStep % melody.length]
      const lowNote = bass[this.arcadeStep % bass.length]
      const accent = 1 + this.intensity * 0.38

      lead.type = this.arcadeStep % 2 === 0 ? 'square' : 'triangle'
      lead.frequency.setValueAtTime(note, now)
      leadGain.gain.setValueAtTime(0.0001, now)
      leadGain.gain.exponentialRampToValueAtTime(0.038 * accent, now + 0.012)
      leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
      lead.connect(leadGain)
      leadGain.connect(gain)
      lead.start(now)
      lead.stop(now + 0.2)

      if (this.arcadeStep % 4 === 0) {
        kick.type = 'sawtooth'
        kick.frequency.setValueAtTime(lowNote, now)
        kick.frequency.exponentialRampToValueAtTime(52, now + 0.09)
        kickGain.gain.setValueAtTime(0.0001, now)
        kickGain.gain.exponentialRampToValueAtTime(0.062 * accent, now + 0.015)
        kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)
        kick.connect(kickGain)
        kickGain.connect(gain)
        kick.start(now)
        kick.stop(now + 0.16)
      }

      this.arcadeStep += 1
    }, 460)
  }

  private startBossLayer() {
    if (this.bossTimer) {
      return
    }

    const pattern = [73, 73, 82, 73, 98, 92, 82, 73]

    this.getAudioContext()
    this.bossTimer = window.setInterval(() => {
      const context = this.getAudioContext()
      const gain = this.bossGain

      if (!gain) {
        return
      }

      const now = context.currentTime
      const drone = context.createOscillator()
      const pulse = context.createOscillator()
      const droneGain = context.createGain()
      const pulseGain = context.createGain()
      const note = pattern[this.bossStep % pattern.length]

      drone.type = 'sawtooth'
      drone.frequency.setValueAtTime(note, now)
      drone.frequency.exponentialRampToValueAtTime(note * 0.92, now + 0.34)
      droneGain.gain.setValueAtTime(0.0001, now)
      droneGain.gain.exponentialRampToValueAtTime(0.16, now + 0.03)
      droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
      drone.connect(droneGain)
      droneGain.connect(gain)
      drone.start(now)
      drone.stop(now + 0.46)

      if (this.bossStep % 2 === 0) {
        pulse.type = 'square'
        pulse.frequency.setValueAtTime(note * 2, now)
        pulseGain.gain.setValueAtTime(0.0001, now)
        pulseGain.gain.exponentialRampToValueAtTime(0.09, now + 0.02)
        pulseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
        pulse.connect(pulseGain)
        pulseGain.connect(gain)
        pulse.start(now)
        pulse.stop(now + 0.14)
      }

      this.bossStep += 1
    }, 520)
  }

  setIntensity(level: number) {
    this.intensity = Math.max(0, Math.min(1, level))

    if (this.music) {
      this.music.volume = 0.2 + this.intensity * 0.05
      this.music.playbackRate = 0.96 + this.intensity * 0.02
    }

    if (this.arcadeGain) {
      this.arcadeGain.gain.value = 0.026 + this.intensity * 0.028
    }
  }

  startBossMusic() {
    this.startMusic()
    this.startBossLayer()

    if (this.music) {
      this.music.volume = 0.1
      this.music.playbackRate = 0.88
    }

    if (this.arcadeGain) {
      this.arcadeGain.gain.value = 0.01
    }

    if (this.bossGain) {
      this.bossGain.gain.value = 0.16
    }
  }

  stopBossMusic() {
    if (this.bossTimer) {
      window.clearInterval(this.bossTimer)
      this.bossTimer = undefined
      this.bossStep = 0
    }

    if (this.bossGain) {
      this.bossGain.gain.value = 0
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
    this.stopBossMusic()
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
    this.startArcadeLayer()
  }

  stopMusic() {
    if (!this.music) {
      return
    }

    this.music.pause()
    this.music.currentTime = 0
    this.music.playbackRate = 1
    this.setIntensity(0)

    if (this.arcadeTimer) {
      window.clearInterval(this.arcadeTimer)
      this.arcadeTimer = undefined
      this.arcadeStep = 0
    }

    this.stopBossMusic()
  }
}

export const gameAudio = new GameAudio()
