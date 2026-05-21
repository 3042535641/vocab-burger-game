const baseUrl = import.meta.env.BASE_URL
const audioVersion = '20260521-pixel-vn-groove'
const versionedAudio = (fileName: string) =>
  `${baseUrl}audio/${fileName}?v=${audioVersion}`

const audioFiles = {
  arrival: versionedAudio('arrival.wav'),
  boss: versionedAudio('boss.wav'),
  bossMusic: versionedAudio('boss-groove.wav'),
  correct: versionedAudio('correct.wav'),
  finaleMusic: versionedAudio('finale-groove.wav'),
  music: versionedAudio('kitchen-groove.wav'),
  serve: versionedAudio('serve.wav'),
  wrong: versionedAudio('wrong.wav'),
}

type ToneSequenceItem = {
  bendTo?: number
  delay: number
  duration?: number
  frequency: number
  type?: OscillatorType
  volume?: number
}

const kitchenGroove = {
  adlib: [659, 784, 988, 784, 1175, 988, 1318, 1568],
  bass: [
    74, 98, 147, 98, 82, 110, 165, 110, 74, 98, 196, 147, 82, 123, 185,
    123,
  ],
  chant: [1568, 1175, 1760, 1318, 2093, 1568, 2349, 1760],
  hook: [
    988, 1318, 1568, 1318, 988, 784, 988, 1175, 1568, 1760, 1568, 1175,
    988, 784, 659, 784, 1175, 1568, 2093, 1568, 1175, 988, 1175, 1318,
    1760, 1568, 1318, 1175, 988, 1175, 784, 988,
  ],
  lead: [
    988, 1318, 1568, 1318, 988, 784, 988, 1175, 1568, 1760, 1568, 1175,
    988, 784, 659, 784,
  ],
  riff: [
    98, 147, 196, 147, 110, 165, 220, 165, 98, 196, 247, 196, 123, 185,
    247, 147,
  ],
} as const

const bossGroove = {
  alarm: [740, 555, 880, 415],
  bass: [49, 61, 41, 73, 55, 82, 49, 98, 37, 73, 55, 110],
  lead: [247, 370, 196, 392, 185, 330, 220, 494, 165, 330, 247, 555],
} as const

class GameAudio {
  private music?: HTMLAudioElement
  private bossMusic?: HTMLAudioElement
  private finaleMusic?: HTMLAudioElement
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
  private directVoicesThisStep = 0
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
    if (this.finaleActive) {
      return this.leanMode ? 32 : 56
    }

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

    if (this.directVoicesThisStep >= this.getDirectVoiceLimit()) {
      return
    }

    this.directVoicesThisStep += 1

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

  private playDirectNoise(duration = 0.04, volume = 0.02, frequency = 1800) {
    if (!this.enabled || !this.pageVisible) {
      return
    }

    if (this.directVoicesThisStep >= this.getDirectVoiceLimit()) {
      return
    }

    this.directVoicesThisStep += 1

    const context = this.getAudioContext()
    const sampleRate = context.sampleRate
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate)
    const data = buffer.getChannelData(0)

    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1
    }

    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    const now = context.currentTime

    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(frequency, now)
    filter.Q.setValueAtTime(4, now)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.buffer = buffer
    source.connect(filter)
    filter.connect(gain)
    gain.connect(context.destination)
    source.start(now)
    source.stop(now + duration + 0.01)
  }

  private playDirectKitchenBeat(step: number, hype: number) {
    const cycle = step % 16

    if (cycle === 0 || cycle === 8) {
      this.playDirectTone(61, 0.16, 'sine', 0.085 * hype, 31)
      this.playDirectTone(122, 0.08, 'sawtooth', 0.034 * hype, 61)
      this.playDirectNoise(0.045, 0.03 * hype, 120)
    }

    if (cycle === 4 || cycle === 12) {
      this.playDirectNoise(0.09, 0.058 * hype, 1220)
      this.playDirectTone(220, 0.05, 'triangle', 0.03 * hype, 110)
      this.playDirectTone(880, 0.035, 'square', 0.018 * hype, 1320)
    }

    if (!this.leanMode && (cycle === 2 || cycle === 5 || cycle === 10 || cycle === 13)) {
      this.playDirectNoise(0.028, 0.024 * hype, cycle % 4 === 1 ? 3100 : 4600)
    }

    if (!this.leanMode && (cycle === 6 || cycle === 14)) {
      this.playDirectNoise(0.04, 0.024 * hype, 1900)
      this.playDirectTone(3136, 0.03, 'square', 0.018 * hype, 2093)
    }
  }

  private playDirectKitchenHook(step: number, hype: number) {
    if (this.leanMode) {
      return
    }

    const cycle = step % 32

    if (cycle % 2 === 1 && ![7, 15, 23, 31].includes(cycle)) {
      return
    }

    const frequency = kitchenGroove.hook[cycle]

    this.playDirectTone(
      frequency,
      cycle % 4 === 0 ? 0.07 : 0.045,
      cycle % 8 === 0 ? 'square' : 'triangle',
      (cycle % 4 === 0 ? 0.035 : 0.024) * hype,
      cycle % 5 === 0 ? frequency * 1.5 : frequency * 0.75,
    )

    if (cycle === 7 || cycle === 15 || cycle === 23 || cycle === 31) {
      this.playDirectTone(2349, 0.038, 'square', 0.024 * hype, 3136)
      this.playDirectNoise(0.025, 0.02 * hype, 3600)
    }
  }

  private playDirectKitchenChord(root: number, volume = 0.026, duration = 0.105) {
    this.playDirectTone(root, duration, 'triangle', volume, root * 1.01)
    this.playDirectTone(root * 1.25, duration * 0.88, 'square', volume * 0.48, root * 1.26)
    this.playDirectTone(root * 1.5, duration * 0.74, 'triangle', volume * 0.58, root * 1.48)
  }

  private playDirectRockChug(step: number, hype: number) {
    if (this.leanMode) {
      return
    }

    const cycle = step % 16
    const roots = [61, 61, 82, 98, 61, 123, 98, 82]
    const root = roots[Math.floor(cycle / 2) % roots.length]

    if ([0, 3, 6, 7, 10, 14].includes(cycle)) {
      this.playDirectTone(root, 0.09, 'sawtooth', 0.05 * hype, root * 0.52)
      this.playDirectTone(root * 2, 0.06, 'square', 0.022 * hype, root * 1.5)
    }

    if (cycle === 7 || cycle === 15) {
      this.playDirectTone(1976, 0.038, 'square', 0.022 * hype, 2960)
      this.playDirectTone(247, 0.08, 'sawtooth', 0.028 * hype, 123)
    }
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

    this.grooveTimer = window.setInterval(() => {
      if (!this.enabled || this.finaleActive) {
        return
      }

      const step = this.grooveStep
      this.directVoicesThisStep = 0
      const leadPattern = this.bossActive ? bossGroove.lead : kitchenGroove.lead
      const bassPattern = this.bossActive ? bossGroove.bass : kitchenGroove.bass
      const lead = leadPattern[step % leadPattern.length]
      const bass = bassPattern[step % bassPattern.length]
      const riff = kitchenGroove.riff[step % kitchenGroove.riff.length]
      const hype = 1 + this.intensity * 0.9
      const ornamentEvery = this.leanMode ? 4 : 2
      const grooveCycle = step % 16

      if (!this.bossActive) {
        this.playDirectKitchenBeat(step, hype)
        this.playDirectKitchenHook(step, hype)
        this.playDirectRockChug(step, hype)

        this.playDirectTone(
          riff,
          grooveCycle % 2 === 0 ? 0.095 : 0.058,
          grooveCycle % 4 === 0 ? 'sawtooth' : 'triangle',
          (grooveCycle % 4 === 0 ? 0.06 : 0.038) * hype,
          grooveCycle % 4 === 0 ? riff * 0.74 : riff * 1.5,
        )

        if (!this.leanMode && (grooveCycle === 2 || grooveCycle === 6 || grooveCycle === 10 || grooveCycle === 14)) {
          this.playDirectKitchenChord(riff * 2, 0.024 * hype, 0.095)
        }

        if (!this.leanMode && (grooveCycle === 4 || grooveCycle === 12)) {
          this.playDirectTone(3136, 0.026, 'square', 0.012 * hype, 2093)
          this.playDirectTone(784, 0.04, 'triangle', 0.014 * hype, 1175)
        }
      }

      this.playDirectTone(
        lead,
        this.bossActive ? 0.1 : 0.052,
        this.bossActive ? 'sawtooth' : grooveCycle % 4 === 1 ? 'square' : 'triangle',
        (this.bossActive ? 0.036 : 0.028) * hype,
        this.bossActive
          ? lead * (step % 2 === 0 ? 1.55 : 0.58)
          : lead * (grooveCycle % 4 === 3 ? 0.75 : 1.5),
      )

      if (step % 2 === 0 || (!this.bossActive && grooveCycle === 7)) {
        this.playDirectTone(
          bass,
          this.bossActive ? 0.16 : 0.105,
          this.bossActive ? 'triangle' : 'sawtooth',
          (this.bossActive ? 0.04 : 0.042) * hype,
          this.bossActive ? bass * 0.62 : bass * 1.5,
        )
      }

      if (!this.bossActive && step % ornamentEvery === 1) {
        const chant =
          kitchenGroove.chant[
            Math.floor(step / ornamentEvery) % kitchenGroove.chant.length
          ]
        this.playDirectTone(chant, 0.052, 'square', 0.024 * hype, chant * 1.25)
        this.playDirectTone(chant / 2, 0.04, 'triangle', 0.016 * hype, chant)
      }

      if (!this.bossActive && !this.leanMode && (grooveCycle === 3 || grooveCycle === 11)) {
        const adlib =
          kitchenGroove.adlib[Math.floor(step / 4) % kitchenGroove.adlib.length]

        this.playDirectTone(adlib, 0.04, 'square', 0.02 * hype, adlib * 1.5)
        this.playDirectTone(adlib * 1.5, 0.032, 'triangle', 0.016 * hype, adlib)
      }

      if (!this.bossActive && !this.leanMode && grooveCycle === 6) {
        this.playDirectTone(1976, 0.04, 'square', 0.02 * hype, 2637)
        this.playDirectTone(247, 0.075, 'triangle', 0.022 * hype, 123)
      }

      if (!this.bossActive && !this.leanMode && grooveCycle === 12) {
        this.playDirectTone(1046, 0.045, 'square', 0.022 * hype, 1568)
        this.playDirectTone(1318, 0.045, 'square', 0.02 * hype, 1976)
        this.playDirectTone(1568, 0.055, 'square', 0.018 * hype, 1046)
        this.playDirectTone(262, 0.09, 'sawtooth', 0.026 * hype, 131)
      }

      if (!this.bossActive && !this.leanMode && grooveCycle === 15) {
        this.playDirectTone(2349, 0.045, 'square', 0.02 * hype, 1175)
        this.playDirectTone(3136, 0.035, 'square', 0.016 * hype, 1568)
      }

      if (this.bossActive && step % ornamentEvery === 1) {
        const alarm =
          bossGroove.alarm[
            Math.floor(step / ornamentEvery) % bossGroove.alarm.length
          ]
        this.playDirectTone(92, 0.18, 'sawtooth', 0.034, 43)
        this.playDirectTone(alarm, 0.052, 'square', 0.026, alarm * 1.85)
        this.playDirectTone(185, 0.075, 'sawtooth', 0.026, 82)
      }

      this.grooveStep += 1
    }, this.getGrooveInterval())
  }

  private stopGroove() {
    if (!this.grooveTimer) {
      return
    }

    window.clearInterval(this.grooveTimer)
    this.grooveTimer = undefined
    this.grooveStep = 0
  }

  private startFinaleMusic() {
    if (!this.enabled || !this.pageVisible) {
      return
    }

    if (!this.finaleMusic) {
      this.finaleMusic = new Audio(audioFiles.finaleMusic)
      this.finaleMusic.loop = false
      this.finaleMusic.preload = 'auto'
    }

    this.finaleMusic.pause()
    this.finaleMusic.currentTime = 0
    this.finaleMusic.volume = this.leanMode ? 0.46 : 0.78
    this.finaleMusic.playbackRate = this.leanMode ? 0.96 : 1
    void this.finaleMusic.play().catch(() => undefined)
  }

  private stopFinaleMusic(resetActive = true) {
    if (resetActive) {
      this.finaleActive = false
    }

    if (!this.finaleMusic) {
      return
    }

    this.finaleMusic.pause()
    this.finaleMusic.currentTime = 0
    this.finaleMusic.playbackRate = 1
  }

  private getGrooveInterval() {
    return this.leanMode ? 640 : 280
  }

  private getDirectVoiceLimit() {
    if (this.leanMode) {
      return 4
    }

    return this.bossActive ? 6 : 7
  }

  private playFinaleGroove() {
    const bassPattern = [73, 49, 98, 61, 123, 49, 147, 61]
    const chantPattern = [784, 988, 1175, 1568, 988, 1760, 1318, 2349]
    const sirenPattern = [392, 784, 523, 1175, 659, 1568, 880, 2093]
    const slamDelays = [0, 280, 560, 980, 1540, 2420, 3380, 4860, 6500, 8120]

    slamDelays.forEach((delay, index) => {
      const heavy = index === 0 || index % 3 === 0

      this.playOneShot(audioFiles.serve, heavy ? 0.95 : 0.52, heavy ? 0.78 : 0.96, delay)
      this.playOneShot(audioFiles.wrong, heavy ? 0.26 : 0.14, 0.62, delay + 28)
      this.playTone(55, heavy ? 0.3 : 0.18, 'sawtooth', heavy ? 0.086 : 0.052, delay)
      this.playTone(110, 0.09, 'square', 0.045, delay + 42)
      this.playTone(880, 0.05, 'square', 0.026, delay + 112)
      this.playTone(1760, 0.035, 'triangle', 0.018, delay + 152)
    })

    for (let index = 0; index < (this.leanMode ? 14 : 24); index += 1) {
      const delay = 560 + index * 265
      const bass = bassPattern[index % bassPattern.length]
      const chant = chantPattern[index % chantPattern.length]
      const siren = sirenPattern[index % sirenPattern.length]
      const strongBeat = index % 4 === 0
      const offBeat = index % 4 === 2

      this.playTone(bass, strongBeat ? 0.22 : 0.11, 'sawtooth', strongBeat ? 0.064 : 0.038, delay)
      this.playTone(bass * 2, 0.07, 'square', strongBeat ? 0.028 : 0.018, delay + 38)

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

    const rootChant = [392, 523, 392, 659, 392, 784, 392, 1046]

    rootChant.forEach((frequency, index) => {
      const delay = 2550 + index * 190

      this.playTone(frequency, 0.055, 'square', 0.03, delay)
      this.playTone(frequency * 2, 0.035, 'triangle', 0.018, delay + 72)
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
      this.finaleMusic?.pause()

      if (this.audioContext?.state === 'running') {
        void this.audioContext.suspend()
      }

      return
    }

    if (!this.enabled) {
      return
    }

    if (this.audioContext?.state === 'suspended') {
      void this.audioContext.resume()
    }

    if (this.finaleActive && this.finaleMusic) {
      void this.finaleMusic.play().catch(() => undefined)
      return
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
          : (this.leanMode ? 0.24 : 0.38) + this.intensity * 0.12
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
    this.stopFinaleMusic()
    this.bossActive = true
    this.stopNormalMusic()
    this.startGroove()

    if (!this.bossMusic) {
      this.bossMusic = new Audio(audioFiles.bossMusic)
      this.bossMusic.loop = true
    }

    this.bossMusic.volume = this.leanMode ? 0.46 : 0.72
    this.bossMusic.playbackRate = 0.76
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

    if (combo >= 4 && !this.leanMode) {
      this.playToneSequence([
        { delay: 118, duration: 0.036, frequency: 1568, type: 'square', volume: 0.026 },
        { delay: 176, duration: 0.036, frequency: 1568, type: 'square', volume: 0.022 },
        { delay: 234, duration: 0.042, frequency: 1976, type: 'square', volume: 0.024 },
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

    if (combo >= 8 && !this.leanMode) {
      this.playOneShot(audioFiles.serve, 0.22, 1.42, 260)
      this.playToneSequence([
        { delay: 420, duration: 0.05, frequency: 3520, type: 'square', volume: 0.02 },
        { delay: 476, duration: 0.06, frequency: 1760, type: 'triangle', volume: 0.018 },
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
    this.playTone(isBoss ? 392 : 523, 0.04, 'square', 0.022, 235)
    this.playTone(isBoss ? 196 : 262, 0.07, 'sawtooth', 0.03, 285)
  }

  playServe(isPerfect = false) {
    if (!this.enabled) {
      return
    }

    this.playOneShot(audioFiles.serve, 0.82, 1)
    this.playOneShot(audioFiles.serve, 0.32, 0.72, 105)
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
      { delay: 510, duration: 0.06, frequency: 1480, type: 'square', volume: 0.024 },
      { delay: 590, duration: 0.08, frequency: 370, type: 'sawtooth', volume: 0.03 },
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
    this.stopFinaleMusic(false)
    this.setIntensity(0)
    this.startFinaleMusic()
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
    this.stopFinaleMusic()
    this.stopBossMusic()
    this.bossActive = false

    if (!this.music) {
      this.music = new Audio(audioFiles.music)
      this.music.loop = true
      this.music.volume = 0.2
    }

    this.music.volume = this.leanMode ? 0.24 : 0.46
    this.music.playbackRate = this.leanMode ? 1 : 1.08
    void this.music.play().catch(() => undefined)
    this.startGroove()
  }

  stopMusic() {
    this.stopFinaleMusic()
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
