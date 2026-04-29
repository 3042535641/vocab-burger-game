type AudioContextConstructor = typeof AudioContext

declare global {
  interface Window {
    webkitAudioContext?: AudioContextConstructor
  }
}

const getAudioContextConstructor = (): AudioContextConstructor | undefined => {
  return window.AudioContext ?? window.webkitAudioContext
}

class GameAudio {
  private context?: AudioContext
  private musicTimer?: number
  private step = 0
  private isMusicPlaying = false

  private ensureContext() {
    if (!this.context) {
      const AudioContextClass = getAudioContextConstructor()

      if (!AudioContextClass) {
        return undefined
      }

      this.context = new AudioContextClass()
    }

    if (this.context.state === 'suspended') {
      void this.context.resume()
    }

    return this.context
  }

  private beep(frequency: number, duration: number, type: OscillatorType) {
    const context = this.ensureContext()

    if (!context) {
      return
    }

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  }

  playCorrect() {
    this.beep(660, 0.08, 'square')
    window.setTimeout(() => this.beep(880, 0.08, 'square'), 70)
  }

  playWrong() {
    this.beep(220, 0.14, 'sawtooth')
    window.setTimeout(() => this.beep(160, 0.12, 'sawtooth'), 90)
  }

  playServe() {
    this.beep(523, 0.07, 'triangle')
    window.setTimeout(() => this.beep(784, 0.08, 'triangle'), 70)
    window.setTimeout(() => this.beep(1046, 0.1, 'triangle'), 140)
  }

  playArrival() {
    this.beep(392, 0.09, 'square')
    window.setTimeout(() => this.beep(494, 0.09, 'square'), 80)
  }

  startMusic() {
    if (this.isMusicPlaying) {
      return
    }

    this.isMusicPlaying = true
    const notes = [196, 247, 294, 247, 330, 294, 247, 220]

    this.musicTimer = window.setInterval(() => {
      const note = notes[this.step % notes.length]
      this.beep(note, 0.1, this.step % 4 === 0 ? 'square' : 'triangle')
      this.step += 1
    }, 210)
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = undefined
    }

    this.isMusicPlaying = false
  }
}

export const gameAudio = new GameAudio()
