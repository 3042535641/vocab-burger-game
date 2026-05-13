const baseUrl = import.meta.env.BASE_URL

const audioFiles = {
  arrival: `${baseUrl}audio/arrival.wav`,
  boss: `${baseUrl}audio/boss.wav`,
  correct: `${baseUrl}audio/correct.wav`,
  music: `${baseUrl}audio/bgm.wav`,
  serve: `${baseUrl}audio/serve.wav`,
  wrong: `${baseUrl}audio/wrong.wav`,
}

type ToneSequenceItem = {
  bendTo?: number
  delay: number
  duration?: number
  frequency: number
  type?: OscillatorType
  volume?: number
}

class GameAudio {
  private music?: HTMLAudioElement
  private bossMusic?: HTMLAudioElement
  private audioContext?: AudioContext
  private enabled = true
  private intensity = 0
  private bossActive = false
  private finaleActive = false
  private leanMode = false
  private effectTimers = new Set<number>()
  private oneShotPools = new Map<string, HTMLAudioElement[]>()
  private grooveTimer?: number
  private grooveStep = 0
  private pageVisible = true

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume()
    }

    return this.audioContext
  }

  private getEffectLimit() {
    return this.leanMode ? 24 : 40
  }

  private scheduleEffect(callback: () => void, delay = 0) {
    if (
      !this.enabled ||
      !this.pageVisible ||
      this.effectTimers.size >= this.getEffectLimit()
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      this.effectTimers.delete(timer)

      if (!this.enabled) {
        return
      }

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
    if (
      !this.enabled ||
      !this.pageVisible ||
      this.effectTimers.size >= this.getEffectLimit()
    ) {
      return
    }

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
    if (
      !this.enabled ||
      !this.pageVisible ||
      this.effectTimers.size >= this.getEffectLimit()
    ) {
      return
    }

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
    if (!this.enabled || !this.pageVisible) {
      return
    }

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

  private playToneSequence(items: ToneSequenceItem[]) {
    if (this.leanMode) {
      items
        .filter((_, index) => index % 2 === 0)
        .forEach((item) =>
          this.playTone(
            item.frequency,
            item.duration,
            item.type,
            item.volume,
            item.delay,
          ),
        )
      return
    }

    items.forEach((item) =>
      this.playTone(
        item.frequency,
        item.duration,
        item.type,
        item.volume,
        item.delay,
      ),
    )
  }

  private startGroove() {
    if (!this.enabled || !this.pageVisible || this.grooveTimer) {
      return
    }

    const normalLead = [784, 988, 1175, 988, 1568, 1175, 1760, 988]
    const normalBass = [98, 130, 98, 164, 130, 196, 82, 130]
    const normalChant = [1568, 1175, 1760, 1318, 2093, 1568]
    const bossLead = [247, 370, 196, 392, 185, 330, 220, 494]
    const bossBass = [49, 61, 41, 73, 55, 82, 49, 98]
    const bossAlarm = [740, 555, 880, 415]

    this.grooveTimer = window.setInterval(() => {
      if (!this.enabled || this.finaleActive) {
        return
      }

      const step = this.grooveStep
      const leadPattern = this.bossActive ? bossLead : normalLead
      const bassPattern = this.bossActive ? bossBass : normalBass
      const lead = leadPattern[step % leadPattern.length]
      const bass = bassPattern[step % bassPattern.length]
      const hype = 1 + this.intensity * 0.9
      const ornamentEvery = this.leanMode ? 4 : 2

      this.playDirectTone(
        lead,
        this.bossActive ? 0.1 : 0.06,
        this.bossActive ? 'sawtooth' : 'square',
        (this.bossActive ? 0.036 : 0.032) * hype,
        this.bossActive ? lead * (step % 2 === 0 ? 1.55 : 0.58) : lead * 1.5,
      )

      if (step % 2 === 0) {
        this.playDirectTone(
          bass,
          this.bossActive ? 0.16 : 0.1,
          'triangle',
          (this.bossActive ? 0.04 : 0.03) * hype,
          this.bossActive ? bass * 0.62 : bass * 1.5,
        )
      }

      if (!this.bossActive && step % ornamentEvery === 1) {
        const chant = normalChant[Math.floor(step / ornamentEvery) % normalChant.length]
        this.playDirectTone(chant, 0.042, 'square', 0.022 * hype, chant * 1.25)
        this.playDirectTone(chant / 2, 0.035, 'triangle', 0.014 * hype, chant)
      }

      if (!this.bossActive && !this.leanMode && step % 8 === 6) {
        this.playDirectTone(1976, 0.04, 'square', 0.02 * hype, 2637)
        this.playDirectTone(247, 0.075, 'triangle', 0.022 * hype, 123)
      }

      if (!this.bossActive && !this.leanMode && step % 16 === 12) {
        this.playDirectTone(1046, 0.045, 'square', 0.02 * hype, 1568)
        this.playDirectTone(1318, 0.045, 'square', 0.018 * hype, 1976)
        this.playDirectTone(1568, 0.055, 'square', 0.016 * hype, 1046)
      }

      if (this.bossActive && step % ornamentEvery === 1) {
        const alarm = bossAlarm[Math.floor(step / ornamentEvery) % bossAlarm.length]
        this.playDirectTone(92, 0.18, 'sawtooth', 0.034, 43)
        this.playDirectTone(alarm, 0.052, 'square', 0.026, alarm * 1.85)
        this.playDirectTone(185, 0.075, 'sawtooth', 0.026, 82)
      }

      this.grooveStep += 1
    }, this.leanMode ? 690 : 485)
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
    const bassPattern = [98, 49, 123, 61, 196, 73, 247, 49]
    const chantPattern = [784, 1175, 988, 1568, 1175, 2093, 1568, 2349]
    const sirenPattern = [392, 784, 523, 1175, 659, 1568, 784, 2093]
    const slamDelays = [0, 480, 960, 1820, 3000, 4440, 6120, 7840]

    slamDelays.forEach((delay, index) => {
      const heavy = index === 0 || index % 3 === 0

      this.playOneShot(audioFiles.serve, heavy ? 0.88 : 0.48, heavy ? 0.82 : 0.94, delay)
      this.playOneShot(audioFiles.wrong, heavy ? 0.22 : 0.12, 0.66, delay + 28)
      this.playTone(73, heavy ? 0.26 : 0.15, 'sawtooth', heavy ? 0.074 : 0.045, delay)
      this.playTone(146, 0.08, 'square', 0.04, delay + 42)
      this.playTone(880, 0.045, 'square', 0.022, delay + 112)
    })

    for (let index = 0; index < (this.leanMode ? 14 : 22); index += 1) {
      const delay = 640 + index * 290
      const bass = bassPattern[index % bassPattern.length]
      const chant = chantPattern[index % chantPattern.length]
      const siren = sirenPattern[index % sirenPattern.length]
      const strongBeat = index % 4 === 0
      const offBeat = index % 4 === 2

      this.playTone(
        bass,
        strongBeat ? 0.19 : 0.1,
        'sawtooth',
        strongBeat ? 0.056 : 0.034,
        delay,
      )

      this.playTone(
        chant,
        0.065,
        index % 2 === 0 ? 'square' : 'triangle',
        offBeat ? 0.048 : 0.034,
        delay + 74,
      )

      if (offBeat && !this.leanMode) {
        this.playTone(chant * 1.5, 0.045, 'square', 0.026, delay + 124)
        this.playTone(siren, 0.09, 'sawtooth', 0.024, delay + 168)
      }

      if (index % 8 === 7) {
        this.playOneShot(audioFiles.correct, 0.34, 1.3, delay + 30)
        this.playTone(1760, 0.06, 'square', 0.032, delay + 120)
        this.playTone(2093, 0.06, 'square', 0.026, delay + 190)
      }
    }

    const lectureGliss = [1046, 988, 1175, 784, 1568, 740, 2093, 1568, 2349, 1175]

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

  setEnabled(enabled: boolean) {
    this.enabled = enabled

    if (!enabled) {
      this.stopMusic()
      this.clearScheduledEffects()
      this.oneShotPools.forEach((pool) => {
        pool.forEach((audio) => {
          audio.pause()
          audio.currentTime = 0
        })
      })
    }
  }

  setPerformanceMode(enabled: boolean) {
    const shouldRestartGroove = Boolean(this.grooveTimer)
    this.leanMode = enabled

    if (shouldRestartGroove) {
      this.stopGroove()
      this.startGroove()
    }
  }

  setPageVisible(visible: boolean) {
    this.pageVisible = visible

    if (!visible) {
      this.clearScheduledEffects()
      this.stopGroove()
      this.music?.pause()
      this.bossMusic?.pause()

      if (this.audioContext?.state === 'running') {
        void this.audioContext.suspend()
      }

      return
    }

    if (!this.enabled || this.finaleActive) {
      return
    }

    if (this.audioContext?.state === 'suspended') {
      void this.audioContext.resume()
    }

    if (this.bossActive && this.bossMusic) {
      void this.bossMusic.play().catch(() => undefined)
      this.startGroove()
      return
    }

    if (this.music) {
      void this.music.play().catch(() => undefined)
      this.startGroove()
    }
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
    if (!this.enabled) {
      return
    }

    this.finaleActive = false
    this.bossActive = true
    this.stopNormalMusic()
    this.startGroove()

    if (!this.bossMusic) {
      this.bossMusic = new Audio(audioFiles.boss)
      this.bossMusic.loop = true
    }

    this.bossMusic.volume = this.leanMode ? 0.42 : 0.6
    this.bossMusic.playbackRate = 0.7
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
    if (!this.enabled) {
      return
    }

    const comboLevel = Math.min(combo, 8)

    this.playOneShot(audioFiles.correct, 0.72, 1 + comboLevel * 0.03)
    this.playToneSequence([
      {
        delay: 0,
        duration: 0.07,
        frequency: 660 + comboLevel * 44,
        type: 'square',
        volume: 0.05,
      },
      {
        delay: 45,
        duration: 0.045,
        frequency: 990 + comboLevel * 58,
        type: 'square',
        volume: 0.03,
      },
      {
        delay: 24,
        duration: 0.055,
        frequency: 196 + comboLevel * 18,
        type: 'triangle',
        volume: 0.02,
      },
    ])

    if (combo >= 3) {
      this.playOneShot(audioFiles.correct, 0.38, 1.18 + comboLevel * 0.02, 70)
      this.playToneSequence([
        { delay: 75, duration: 0.08, frequency: 880, type: 'triangle', volume: 0.04 },
        { delay: 135, duration: 0.055, frequency: 1320, type: 'square', volume: 0.03 },
        { delay: 190, duration: 0.045, frequency: 1760, type: 'square', volume: 0.024 },
        { delay: 245, duration: 0.05, frequency: 660, type: 'square', volume: 0.026 },
      ])
    }

    if (combo >= 6 && !this.leanMode) {
      this.playOneShot(audioFiles.correct, 0.3, 1.38, 145)
      this.playToneSequence([
        { delay: 210, duration: 0.05, frequency: 2093, type: 'square', volume: 0.028 },
        { delay: 270, duration: 0.06, frequency: 2637, type: 'triangle', volume: 0.024 },
        { delay: 330, duration: 0.055, frequency: 3136, type: 'square', volume: 0.022 },
        { delay: 390, duration: 0.045, frequency: 1568, type: 'square', volume: 0.018 },
      ])
    }
  }

  playWrong(isBoss = false) {
    if (!this.enabled) {
      return
    }

    this.playOneShot(audioFiles.wrong, 0.78, isBoss ? 0.86 : 0.92)
    this.playOneShot(audioFiles.wrong, 0.34, 0.72, 90)
    this.playTone(isBoss ? 110 : 146, 0.16, 'sawtooth', 0.058, 0)
    this.playTone(isBoss ? 55 : 82, 0.14, 'square', 0.038, 90)
    this.playTone(isBoss ? 220 : 294, 0.05, 'sawtooth', 0.026, 170)
  }

  playServe(isPerfect = false) {
    if (!this.enabled) {
      return
    }

    this.playOneShot(audioFiles.serve, 0.82, 1)
    this.playToneSequence([
      { delay: 0, duration: 0.06, frequency: 523, type: 'square', volume: 0.035 },
      { delay: 75, duration: 0.08, frequency: 784, type: 'square', volume: 0.04 },
      { delay: 150, duration: 0.06, frequency: 1046, type: 'triangle', volume: 0.03 },
      { delay: 220, duration: 0.045, frequency: 1568, type: 'square', volume: 0.022 },
      { delay: 285, duration: 0.04, frequency: 784, type: 'square', volume: 0.026 },
    ])

    if (isPerfect) {
      this.playOneShot(audioFiles.correct, 0.5, 1.22, 120)
      this.playToneSequence([
        { delay: 140, duration: 0.1, frequency: 1046, type: 'triangle', volume: 0.045 },
        { delay: 240, duration: 0.1, frequency: 1568, type: 'square', volume: 0.034 },
        { delay: 340, duration: 0.12, frequency: 2093, type: 'square', volume: 0.03 },
      ])
    }
  }

  playArrival() {
    if (!this.enabled) {
      return
    }

    this.playOneShot(audioFiles.arrival, 0.6)
    this.playTone(392, 0.08, 'square', 0.03)
    this.playTone(784, 0.045, 'square', 0.018, 80)
    this.playTone(1175, 0.04, 'square', 0.016, 138)
  }

  playBoss() {
    if (!this.enabled) {
      return
    }

    this.playOneShot(audioFiles.boss, 0.8)
    this.playOneShot(audioFiles.wrong, 0.36, 0.76, 160)
    this.playToneSequence([
      { delay: 0, duration: 0.22, frequency: 82, type: 'sawtooth', volume: 0.06 },
      { delay: 120, duration: 0.16, frequency: 164, type: 'sawtooth', volume: 0.044 },
      { delay: 260, duration: 0.2, frequency: 61, type: 'square', volume: 0.038 },
      { delay: 420, duration: 0.08, frequency: 740, type: 'square', volume: 0.026 },
    ])
  }

  playVictory() {
    if (!this.enabled) {
      return
    }

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

    for (let delay = 1800; delay <= 7400; delay += 1800) {
      this.playOneShot(audioFiles.correct, 0.36, 1.22, delay)
      this.playTone(523, 0.1, 'triangle', 0.032, delay + 60)
      this.playTone(880, 0.11, 'square', 0.036, delay + 170)
      this.playTone(1318, 0.13, 'square', 0.034, delay + 300)
    }
  }

  startMusic() {
    if (!this.enabled) {
      return
    }

    this.finaleActive = false
    this.stopBossMusic()
    this.bossActive = false

    if (!this.music) {
      this.music = new Audio(audioFiles.music)
      this.music.loop = true
      this.music.volume = 0.2
    }

    this.music.volume = this.leanMode ? 0.14 : 0.24
    this.music.playbackRate = this.leanMode ? 0.98 : 1.08
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
