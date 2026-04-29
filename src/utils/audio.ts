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

  private playOneShot(src: string, volume = 0.7) {
    const audio = new Audio(src)
    audio.volume = volume
    void audio.play().catch(() => undefined)
  }

  playCorrect() {
    this.playOneShot(audioFiles.correct, 0.7)
  }

  playWrong() {
    this.playOneShot(audioFiles.wrong, 0.75)
  }

  playServe() {
    this.playOneShot(audioFiles.serve, 0.8)
  }

  playArrival() {
    this.playOneShot(audioFiles.arrival, 0.6)
  }

  playBoss() {
    this.playOneShot(audioFiles.boss, 0.8)
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
