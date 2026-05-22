import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const audioDir = join(rootDir, 'public', 'audio')
const sampleRate = 44_100
const tau = Math.PI * 2

function clamp(value) {
  return Math.max(-1, Math.min(1, value))
}

function envelope(position, attack = 0.01, release = 0.08) {
  if (position < attack) {
    return position / attack
  }

  if (position > 1 - release) {
    return Math.max(0, (1 - position) / release)
  }

  return 1
}

function noteToFrequency(note) {
  const match = /^([A-G]#?)(\d)$/.exec(note)

  if (!match) {
    throw new Error(`Bad note: ${note}`)
  }

  const semitones = {
    A: 0,
    'A#': 1,
    B: 2,
    C: 3,
    'C#': 4,
    D: 5,
    'D#': 6,
    E: 7,
    F: 8,
    'F#': 9,
    G: 10,
    'G#': 11,
  }
  const [, name, octaveText] = match
  const octave = Number(octaveText)
  const distance = semitones[name] + (octave - 4) * 12

  return 440 * 2 ** (distance / 12)
}

function pulse(phase, width = 0.5) {
  return phase % 1 < width ? 1 : -1
}

function saw(phase) {
  return ((phase % 1) * 2) - 1
}

function triangle(phase) {
  return 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25))
}

function noise(index) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453

  return (value - Math.floor(value)) * 2 - 1
}

function writeWav(samples) {
  const dataSize = samples.length * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  samples.forEach((sample, index) => {
    buffer.writeInt16LE(Math.round(clamp(sample) * 32767), 44 + index * 2)
  })

  return buffer
}

function renderKitchenGroove() {
  const bpm = 106
  const beats = 64
  const seconds = (60 / bpm) * beats
  const totalSamples = Math.floor(seconds * sampleRate)
  const samples = new Float32Array(totalSamples)
  const bass = ['E2', 'E2', 'G2', 'A2', 'B1', 'D2', 'E2', 'G2', 'A2', 'G2', 'E2', 'D2', 'B1', 'D2', 'E2', 'E2']
  const melody = [
    'E4',
    'G4',
    'A4',
    'B4',
    'D5',
    'B4',
    'A4',
    'G4',
    'E4',
    'B4',
    'D5',
    'E5',
    'G5',
    'E5',
    'D5',
    'B4',
  ]
  const chordRoots = ['E3', 'G3', 'A3', 'B3']

  for (let index = 0; index < totalSamples; index += 1) {
    const time = index / sampleRate
    const beat = (time * bpm) / 60
    const beatIndex = Math.floor(beat)
    const beatPhase = beat % 1
    const sixteenth = Math.floor(beat * 4)
    const sixteenthPhase = (beat * 4) % 1
    const phrase = beat / beats
    const bar = Math.floor(beat / 4)
    const sectionLift = bar % 8 >= 4 ? 1.12 : 1
    const lateHat = sixteenth % 2 === 1 ? 0.78 : 1
    let value = 0

    const bassFrequency = noteToFrequency(bass[sixteenth % bass.length])
    if (sixteenth % 2 === 0 || sixteenth % 16 === 11 || sixteenth % 16 === 15) {
      value += saw(time * bassFrequency) * envelope(sixteenthPhase, 0.012, 0.42) * 0.28
      value += pulse(time * bassFrequency * 2, 0.36) * envelope(sixteenthPhase, 0.008, 0.26) * 0.06
      value += Math.sin(time * tau * bassFrequency * 0.5) * envelope(beatPhase, 0.008, 0.24) * 0.16
    }

    if (
      sixteenth % 4 === 0 ||
      sixteenth % 8 === 3 ||
      sixteenth % 8 === 5 ||
      sixteenth % 16 === 14
    ) {
      const melodyFrequency = noteToFrequency(melody[Math.floor(sixteenth / 2) % melody.length])
      const bend = melodyFrequency * (sixteenth % 16 === 14 ? 1.18 : 0.985)
      value += triangle(time * melodyFrequency) * envelope(sixteenthPhase, 0.012, 0.42) * 0.2 * sectionLift
      value += pulse(time * bend * 2, 0.34) * envelope(sixteenthPhase, 0.008, 0.3) * 0.068
    }

    if (sixteenth % 4 === 2 || sixteenth % 16 === 12) {
      const chord = noteToFrequency(chordRoots[Math.floor(sixteenth / 8) % chordRoots.length])
      value += triangle(time * chord) * envelope(sixteenthPhase, 0.016, 0.62) * 0.11
      value += triangle(time * chord * 1.25) * envelope(sixteenthPhase, 0.016, 0.58) * 0.07
      value += pulse(time * chord * 1.5, 0.42) * envelope(sixteenthPhase, 0.016, 0.54) * 0.05
    }

    const padRoot = noteToFrequency(chordRoots[bar % chordRoots.length])
    value += triangle(time * padRoot) * 0.018
    value += triangle(time * padRoot * 1.25) * 0.012

    if (beatIndex % 4 === 0 && beatPhase < 0.18) {
      value += Math.sin(time * tau * (92 - beatPhase * 220)) * envelope(beatPhase / 0.18, 0.01, 0.5) * 0.5
      value += saw(time * 46) * envelope(beatPhase / 0.18, 0.01, 0.42) * 0.1
    }

    if (beatIndex % 4 === 2 && beatPhase < 0.2) {
      value += noise(index) * envelope(beatPhase / 0.2, 0.008, 0.34) * 0.24
      value += Math.sin(time * tau * 164) * envelope(beatPhase / 0.2, 0.008, 0.42) * 0.13
    }

    if (sixteenth % 2 === 1 && sixteenthPhase < 0.34) {
      value += noise(index) * envelope(sixteenthPhase / 0.34, 0.01, 0.52) * 0.065 * lateHat
    }

    if (sixteenth % 4 === 3 && sixteenthPhase < 0.34) {
      value += pulse(time * 1460, 0.42) * envelope(sixteenthPhase / 0.34, 0.01, 0.3) * 0.045
    }

    if (sixteenth % 16 === 7 || sixteenth % 16 === 15) {
      const talkBox = 620 + sixteenthPhase * 420
      value += pulse(time * talkBox, 0.45) * envelope(sixteenthPhase, 0.02, 0.34) * 0.075
      value += triangle(time * talkBox * 1.5) * envelope(sixteenthPhase, 0.02, 0.34) * 0.042
    }

    if (sixteenth % 16 === 15 && sixteenthPhase < 0.55) {
      value += pulse(time * 2200, 0.4) * envelope(sixteenthPhase / 0.55, 0.02, 0.34) * 0.105
      value += noise(index) * envelope(sixteenthPhase / 0.55, 0.01, 0.38) * 0.07
    }

    if (bar % 8 >= 6 && sixteenth % 4 === 1) {
      const stab = noteToFrequency(melody[(sixteenth + bar) % melody.length]) * 1.5
      value += pulse(time * stab, 0.36) * envelope(sixteenthPhase, 0.012, 0.22) * 0.055
      value += triangle(time * (stab / 2)) * envelope(sixteenthPhase, 0.012, 0.28) * 0.035
    }

    const edgeFade = Math.min(1, index / 180, (totalSamples - index - 1) / 180)
    samples[index] = clamp(Math.tanh(value * 1.16) * edgeFade * 0.9)
  }

  return samples
}

function renderBossGroove() {
  const bpm = 118
  const beats = 48
  const seconds = (60 / bpm) * beats
  const totalSamples = Math.floor(seconds * sampleRate)
  const samples = new Float32Array(totalSamples)
  const bass = ['C2', 'D#2', 'C2', 'F#2', 'C2', 'G2', 'D#2', 'C2']
  const siren = ['C4', 'G4', 'D#4', 'A#4']

  for (let index = 0; index < totalSamples; index += 1) {
    const time = index / sampleRate
    const beat = (time * bpm) / 60
    const beatIndex = Math.floor(beat)
    const beatPhase = beat % 1
    const sixteenth = Math.floor(beat * 4)
    const sixteenthPhase = (beat * 4) % 1
    let value = 0

    const bassFrequency = noteToFrequency(bass[sixteenth % bass.length])
    value += saw(time * bassFrequency) * envelope(sixteenthPhase, 0.015, 0.42) * 0.27
    value += Math.sin(time * tau * bassFrequency * 0.5) * envelope(beatPhase, 0.01, 0.36) * 0.16

    if (sixteenth % 4 === 1) {
      const alarm = noteToFrequency(siren[Math.floor(sixteenth / 4) % siren.length])
      value += pulse(time * alarm, 0.42) * envelope(sixteenthPhase, 0.02, 0.38) * 0.16
      value += saw(time * alarm * 0.5) * envelope(sixteenthPhase, 0.02, 0.38) * 0.08
    }

    if (beatIndex % 2 === 0 && beatPhase < 0.18) {
      value += Math.sin(time * tau * (82 - beatPhase * 190)) * envelope(beatPhase / 0.18, 0.02, 0.48) * 0.5
    }

    if (beatIndex % 2 === 1 && beatPhase < 0.2) {
      value += noise(index) * envelope(beatPhase / 0.2, 0.01, 0.38) * 0.22
    }

    if (sixteenth % 2 === 1 && sixteenthPhase < 0.28) {
      value += noise(index) * envelope(sixteenthPhase / 0.28, 0.01, 0.45) * 0.075
    }

    samples[index] = clamp(value * 0.78)
  }

  return samples
}

function renderFinaleGroove() {
  const bpm = 132
  const beats = 24
  const seconds = (60 / bpm) * beats
  const totalSamples = Math.floor(seconds * sampleRate)
  const samples = new Float32Array(totalSamples)
  const bass = ['D2', 'A1', 'F2', 'C2', 'G2', 'D2', 'A2', 'E2']
  const fanfare = ['D4', 'F4', 'A4', 'C5', 'D5', 'A4', 'F5', 'D5']

  for (let index = 0; index < totalSamples; index += 1) {
    const time = index / sampleRate
    const beat = (time * bpm) / 60
    const beatIndex = Math.floor(beat)
    const beatPhase = beat % 1
    const sixteenth = Math.floor(beat * 4)
    const sixteenthPhase = (beat * 4) % 1
    const progress = index / totalSamples
    let value = 0

    const slamFrequency = noteToFrequency(bass[sixteenth % bass.length])
    value += saw(time * slamFrequency) * envelope(sixteenthPhase, 0.012, 0.38) * 0.26
    value += Math.sin(time * tau * slamFrequency * 0.5) * envelope(beatPhase, 0.01, 0.28) * 0.22

    if (beatIndex % 2 === 0 && beatPhase < 0.2) {
      value += Math.sin(time * tau * (112 - beatPhase * 310)) * envelope(beatPhase / 0.2, 0.015, 0.42) * 0.56
      value += noise(index) * envelope(beatPhase / 0.2, 0.01, 0.36) * 0.14
    }

    if (sixteenth % 2 === 1 && sixteenthPhase < 0.26) {
      value += noise(index) * envelope(sixteenthPhase / 0.26, 0.01, 0.36) * 0.105
    }

    if (sixteenth % 4 === 3) {
      const leadFrequency = noteToFrequency(fanfare[Math.floor(sixteenth / 4) % fanfare.length])
      value += pulse(time * leadFrequency, 0.44) * envelope(sixteenthPhase, 0.012, 0.3) * 0.16
      value += triangle(time * leadFrequency * 1.5) * envelope(sixteenthPhase, 0.012, 0.3) * 0.08
    }

    if (sixteenth % 16 === 14 || sixteenth % 16 === 15) {
      const rise = 880 + sixteenthPhase * 3200
      value += pulse(time * rise, 0.5) * envelope(sixteenthPhase, 0.02, 0.22) * 0.1
    }

    const fadeIn = Math.min(1, progress * 24)
    const fadeOut = Math.min(1, (1 - progress) * 24)
    samples[index] = clamp(value * Math.min(fadeIn, fadeOut, 1) * 0.82)
  }

  return samples
}

await mkdir(audioDir, { recursive: true })
await writeFile(join(audioDir, 'kitchen-groove.wav'), writeWav(renderKitchenGroove()))
await writeFile(join(audioDir, 'boss-groove.wav'), writeWav(renderBossGroove()))
await writeFile(join(audioDir, 'finale-groove.wav'), writeWav(renderFinaleGroove()))

console.log('Generated kitchen-groove.wav, boss-groove.wav and finale-groove.wav')
