export function zeroizeBuffer(
  buffer: Uint8Array | ArrayBuffer | null | undefined
): void {
  if (!buffer) return
  if (buffer instanceof Uint8Array) {
    buffer.fill(0)
  } else if (buffer instanceof ArrayBuffer) {
    new Uint8Array(buffer).fill(0)
  }
}
