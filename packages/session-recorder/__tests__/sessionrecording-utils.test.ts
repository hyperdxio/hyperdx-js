import { splitIntoChunks } from '../src/sessionrecording-utils';

describe('splitIntoChunks', () => {
  it('returns the string as-is when it fits in one chunk', () => {
    const s = 'hello';
    expect(splitIntoChunks(s, 1024)).toEqual([s]);
  });

  it('splits large payloads and reassembles losslessly', () => {
    const s = 'x'.repeat(25);
    const chunks = splitIntoChunks(s, 10);
    expect(chunks.length).toBe(3);
    expect(chunks.join('')).toBe(s);
  });

  it('retries once with a fresh decoder when decoding throws', () => {
    const RealTextDecoder = global.TextDecoder;
    let constructed = 0;
    // First decoder instance always throws (mimics WebKit's corrupted
    // TextDecoder, https://bugs.webkit.org/show_bug.cgi?id=286266)
    class FlakyTextDecoder extends RealTextDecoder {
      private broken = ++constructed === 1;
      decode(...args: Parameters<TextDecoder['decode']>): string {
        if (this.broken) {
          throw new RangeError('Bad value');
        }
        return super.decode(...args);
      }
    }
    global.TextDecoder = FlakyTextDecoder as typeof TextDecoder;
    try {
      const s = 'x'.repeat(25);
      expect(splitIntoChunks(s, 10).join('')).toBe(s);
      expect(constructed).toBe(2);
    } finally {
      global.TextDecoder = RealTextDecoder;
    }
  });

  it('does not corrupt multi-byte characters at chunk boundaries', () => {
    // '€' is 3 bytes in UTF-8; a 10-byte chunk size bisects it
    const s = '€'.repeat(10);
    const chunks = splitIntoChunks(s, 10);
    expect(chunks.join('')).toBe(s);
    expect(chunks.join('')).not.toContain('�');
  });
});
