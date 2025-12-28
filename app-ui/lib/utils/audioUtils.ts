/**
 * Merges multiple Uint8Array chunks into a single array
 */
export function mergeUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

/**
 * Converts PCM audio data to WAV format
 */
export function pcmToWav(pcmData: Uint8Array): Uint8Array {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  let offset = 0;

  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      const codePoint = s.codePointAt(i);
      if (codePoint !== undefined) {
        view.setUint8(offset++, codePoint);
      }
    }
  }

  writeString("RIFF");
  view.setUint32(offset, 36 + pcmData.length, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, byteRate, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitsPerSample, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, pcmData.length, true);
  offset += 4;

  new Uint8Array(buffer, 44).set(pcmData);
  return new Uint8Array(buffer);
}
