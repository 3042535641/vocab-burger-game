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

  private playOneShot(src: string, volume = 0.7, playbackRate = 1, delay = 0) {
    window.setTimeout(() => {
      const audio = new Audio(src)
      audio.volume = volume
      audio.playbackRate = playbackRate
      void audio.play().catch(() => undefined)
    }, delay)
  }

  playCorrect(combo = 1) {
    this.playOneShot(audioFiles.correct, 0.72, 1 + Math.min(combo, 8) * 0.025)

    if (combo >= 3) {
      this.playOneShot(audioFiles.correct, 0.42, 1.18, 70)
    }
  }

  playWrong(isBoss = false) {
    this.playOneShot(audioFiles.wrong, 0.78, isBoss ? 0.86 : 0.92)
    this.playOneShot(audioFiles.wrong, 0.34, 0.72, 90)
  }

  playServe(isPerfect = false) {
    this.playOneShot(audioFiles.serve, 0.82, 1)

    if (isPerfect) {
      this.playOneShot(audioFiles.correct, 0.5, 1.22, 120)
    }
  }

  playArrival() {
    this.playOneShot(audioFiles.arrival, 0.6)
  }

  playBoss() {
    this.playOneShot(audioFiles.boss, 0.8)
    this.playOneShot(audioFiles.wrong, 0.36, 0.76, 160)
  }

  startMusic() {
    if (!this.music) {
      this.music = new Audio(audioFiles.music)
      this.music.loop = true
      this.music.volume = 0.28
    }

    void this.music.play().catch(() => undefined)
  }

  stopMusic() {
    if (!this.music) {
      return
    }

    this.music.pause()
    this.music.currentTime = 0
  }
}

export const gameAudio = new GameAudio()
