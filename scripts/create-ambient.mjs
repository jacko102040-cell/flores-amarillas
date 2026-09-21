// Original, procedurally composed ambient loop; no samples or third-party song.
import { writeFileSync, mkdirSync } from 'node:fs'
const rate = 22050, duration = 24, samples = new Float64Array(rate * duration)
const frequency = midi => 440 * 2 ** ((midi - 69) / 12)
function note(midi, start, length, gain) {
  const f = frequency(midi)
  for (let i = 0; i < length * rate; i++) {
    const t = i / rate
    const attack = Math.min(1, t / 0.04)
    const release = Math.min(1, (length - t) / 0.5)
    const envelope = attack * release * Math.exp(-t * 0.8)
    const tone = Math.sin(2 * Math.PI * f * t) + 0.23 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 1.3) + 0.065 * Math.sin(2 * Math.PI * f * 3 * t)
    const index = (Math.round(start * rate) + i) % samples.length
    samples[index] += tone * envelope * gain
    // Circular, quiet delay gives a seamless tail at the loop boundary.
    samples[(index + Math.round(0.375 * rate)) % samples.length] += tone * envelope * gain * 0.14
  }
}
const chords = [[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,59]]
chords.forEach((chord, bar) => {
  chord.forEach((midi, i) => note(midi, bar * 6 + i * 0.24, 5, 0.075))
  const notes = [chord[2] + 12, chord[3] + 12, chord[1] + 12, chord[2] + 12]
  notes.forEach((midi, i) => note(midi, bar * 6 + 0.75 + i * 1.2, 3.2, 0.07))
})
const bytes = Buffer.alloc(44 + samples.length * 2)
bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVE', 8)
bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20)
bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28)
bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples.length * 2, 40)
samples.forEach((value, index) => bytes.writeInt16LE(Math.round(Math.tanh(value) * 27000), 44 + index * 2))
mkdirSync(new URL('../public', import.meta.url), { recursive: true })
writeFileSync(new URL('../public/primavera.wav', import.meta.url), bytes)
console.log(`Original ambient audio: ${duration}s, ${bytes.length} bytes`)
