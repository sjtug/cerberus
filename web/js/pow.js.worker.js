// Pure JS PoW worker (fallback when WebAssembly is unavailable)
import { compress8, blake3Hash, encodeHexLE, computeMask, IV, FLAG_CHUNK_START, FLAG_CHUNK_END, FLAG_ROOT } from './blake3.js';

const REPORT_PERIOD = 16384;

addEventListener('message', (event) => {
  const { data, difficulty, nonce: threadId, threads } = event.data;

  const mask = computeMask(difficulty);
  const reportSlot = (threadId * REPORT_PERIOD / threads) | 0;

  // Compute salt = blake3(data) as hex bytes
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const saltBytes = blake3Hash(dataBytes);

  // Convert salt (32 bytes) to 64-char hex, then to 64 bytes of ASCII
  const hex = '0123456789abcdef';
  const saltHex = new Uint8Array(64);
  for (let i = 0; i < 32; i++) {
    saltHex[i * 2] = hex.charCodeAt(saltBytes[i] >> 4);
    saltHex[i * 2 + 1] = hex.charCodeAt(saltBytes[i] & 0xf);
  }

  // Compute midstate: compress(IV, saltHex as u32[16], counter=0, blockLen=64, FLAG_CHUNK_START)
  const initBlock = new Array(16);
  for (let i = 0; i < 16; i++) {
    initBlock[i] = saltHex[i * 4] |
      (saltHex[i * 4 + 1] << 8) |
      (saltHex[i * 4 + 2] << 16) |
      (saltHex[i * 4 + 3] << 24);
  }
  const midstate = compress8(IV, initBlock, 0, 64, FLAG_CHUNK_START);

  let set = threadId;
  const trailingFlags = FLAG_CHUNK_END | FLAG_ROOT;

  while (true) {
    const msg = new Array(16).fill(0);
    msg[0] = set;
    let attemptedNonces = 0;

    for (let nonce = 0; nonce < 0xFFFFFFFF; nonce++) {
      msg[1] = nonce;

      const hash = compress8(midstate, msg, 0, 8, trailingFlags);
      attemptedNonces++;

      if (attemptedNonces % REPORT_PERIOD === reportSlot) {
        postMessage(REPORT_PERIOD);
      }

      if ((hash[0] & mask) === 0) {
        const hashHex = encodeHexLE(hash);
        // solution = nonce as u64 | (batchId as u64) << 32
        const solution = nonce + set * 0x100000000;
        postMessage({
          hash: hashHex,
          difficulty,
          nonce: solution,
        });
        return;
      }
    }

    // Exhausted nonce space for this batch_id, try next
    set += threads;
    if (set > 0xFFFFFFFF) return;
  }
});
