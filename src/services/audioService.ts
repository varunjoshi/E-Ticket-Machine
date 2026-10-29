/**
 * Small Web Audio helper. All sounds are synthesised locally — no assets, no
 * network. The context is only created after a user gesture.
 */
class MachineAudio {
  private ctx: AudioContext | null = null
  enabled = true

  private ensure(): AudioContext | null {
    if (!this.enabled) return null
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    if (!this.ctx) this.ctx = new Ctor()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  setEnabled(v: boolean) {
    this.enabled = v
    if (!v && this.ctx) void this.ctx.suspend()
  }

  unlock() {
    this.ensure()
  }

  click() {
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(880, t)
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.03)
    gain.gain.setValueAtTime(0.035, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.055)
  }

  error() {
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = 180
      gain.gain.setValueAtTime(0.03, t + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.1)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t + i * 0.12)
      osc.stop(t + i * 0.12 + 0.11)
    }
  }

  success() {
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    ;[660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.04, t + i * 0.085)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.085 + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t + i * 0.085)
      osc.stop(t + i * 0.085 + 0.17)
    })
  }

  /** Printer motor plus stepper chatter. Returns a stop function. */
  startMotor(durationMs = 4000): () => void {
    const ctx = this.ensure()
    if (!ctx) return () => {}
    const t = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, t)
    master.gain.exponentialRampToValueAtTime(0.07, t + 0.12)
    master.connect(ctx.destination)

    const motor = ctx.createOscillator()
    const motorGain = ctx.createGain()
    motor.type = 'sawtooth'
    motor.frequency.setValueAtTime(72, t)
    motor.frequency.linearRampToValueAtTime(86, t + durationMs / 1000)
    motorGain.gain.value = 0.5
    motor.connect(motorGain).connect(master)
    motor.start(t)

    // Filtered noise gives the paper-feed hiss.
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.5))
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const channel = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) channel[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2400
    filter.Q.value = 0.8
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.25
    noise.connect(filter).connect(noiseGain).connect(master)
    noise.start(t)

    let stopped = false
    const stop = () => {
      if (stopped) return
      stopped = true
      const now = ctx.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value || 0.05, now)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)
      window.setTimeout(() => {
        try {
          motor.stop()
          noise.stop()
          master.disconnect()
        } catch {
          /* already stopped */
        }
      }, 200)
    }
    return stop
  }
}

export const machineAudio = new MachineAudio()
