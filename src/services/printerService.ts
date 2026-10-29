/**
 * Printer helpers. "Print" in the browser is always a browser print dialog or
 * a download; it is never a guaranteed physical print. ESC/POS over Web Serial
 * is an explicitly experimental, user-initiated path for compatible hardware.
 */

interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  writable: WritableStream<Uint8Array> | null
}

interface SerialLike {
  requestPort(): Promise<SerialPortLike>
}

export function hasWebSerial(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

export function canShareFiles(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.canShare
}

export function buildEscPos(text: string, paperWidth: 58 | 80): Uint8Array {
  const columns = paperWidth === 80 ? 42 : 32
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = [
    new Uint8Array([0x1b, 0x40]), // initialize
    new Uint8Array([0x1b, 0x61, 0x00]), // left align
  ]
  for (const rawLine of text.split('\n')) {
    // ESC/POS code pages do not reliably carry Devanagari or ₹. Transliterate
    // unsupported glyphs to '?' rather than silently pretending they printed.
    const line = rawLine
      .replace(/₹/g, 'Rs ')
      .split('')
      .map((ch) => (ch.charCodeAt(0) > 126 ? '?' : ch))
      .join('')
      .slice(0, columns)
    chunks.push(encoder.encode(`${line}\n`))
  }
  chunks.push(new Uint8Array([0x0a, 0x0a, 0x1b, 0x64, 0x03])) // feed
  chunks.push(new Uint8Array([0x1d, 0x56, 0x01])) // partial cut
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

export async function sendToSerialPrinter(text: string, paperWidth: 58 | 80): Promise<{ ok: boolean; message: string }> {
  const serial = (navigator as unknown as { serial?: SerialLike }).serial
  if (!serial) {
    return {
      ok: false,
      message: 'Web Serial is not available in this browser. Use the browser print dialog or download the ticket instead. (Chrome/Edge on desktop over HTTPS or localhost.)',
    }
  }
  let port: SerialPortLike | null = null
  try {
    port = await serial.requestPort()
    await port.open({ baudRate: 9600 })
    if (!port.writable) throw new Error('Printer port is not writable.')
    const writer = port.writable.getWriter()
    await writer.write(buildEscPos(text, paperWidth))
    writer.releaseLock()
    return { ok: true, message: 'ESC/POS data sent at 9600 baud. Check the physical printer. Devanagari and ₹ are not supported on ESC/POS and were replaced.' }
  } catch (err) {
    return { ok: false, message: `Physical printer failed: ${err instanceof Error ? err.message : 'unknown error'}. The on-screen simulation is unaffected.` }
  } finally {
    if (port) {
      try {
        await port.close()
      } catch {
        /* some drivers auto-close */
      }
    }
  }
}

export function downloadTicketText(text: string, serial: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${serial}.txt`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
