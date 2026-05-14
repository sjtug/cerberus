// Pure JavaScript implementation of BLAKE3 compression (single-chunk, truncated to 8 words)
// Ported from pow/src/blake3.rs

export const IV = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

export const FLAG_CHUNK_START = 0x01;
export const FLAG_CHUNK_END = 0x02;
export const FLAG_ROOT = 0x08;

const PERMUTATION = [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8];

// Precompute message schedule (7 rounds)
const MESSAGE_SCHEDULE = (() => {
  const out = [];
  let ix = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  out.push(ix.slice());
  for (let i = 1; i < 7; i++) {
    const newIx = new Array(16);
    for (let j = 0; j < 16; j++) newIx[j] = ix[PERMUTATION[j]];
    ix = newIx;
    out.push(newIx.slice());
  }
  return out;
})();

function g(state, a, b, c, d, mx, my) {
  state[a] = (state[a] + state[b] + mx) | 0;
  state[d] = ror32(state[d] ^ state[a], 16);
  state[c] = (state[c] + state[d]) | 0;
  state[b] = ror32(state[b] ^ state[c], 12);
  state[a] = (state[a] + state[b] + my) | 0;
  state[d] = ror32(state[d] ^ state[a], 8);
  state[c] = (state[c] + state[d]) | 0;
  state[b] = ror32(state[b] ^ state[c], 7);
}

function ror32(v, n) {
  return (v >>> n) | (v << (32 - n));
}

function roundFixed(state, m, round) {
  const s = MESSAGE_SCHEDULE[round];
  // Mix columns
  g(state, 0, 4,  8, 12, m[s[0]],  m[s[1]]);
  g(state, 1, 5,  9, 13, m[s[2]],  m[s[3]]);
  g(state, 2, 6, 10, 14, m[s[4]],  m[s[5]]);
  g(state, 3, 7, 11, 15, m[s[6]],  m[s[7]]);
  // Mix diagonals
  g(state, 0, 5, 10, 15, m[s[8]],  m[s[9]]);
  g(state, 1, 6, 11, 12, m[s[10]], m[s[11]]);
  g(state, 2, 7,  8, 13, m[s[12]], m[s[13]]);
  g(state, 3, 4,  9, 14, m[s[14]], m[s[15]]);
}

/**
 * Truncated BLAKE3 compression function (returns first 8 words).
 * @param {number[]} chainingValue - 8 u32 words
 * @param {number[]} blockWords - 16 u32 words
 * @param {number} counter - 64-bit counter (as Number, only low 32 bits used here)
 * @param {number} blockLen - block length in bytes
 * @param {number} flags - BLAKE3 flags
 * @returns {number[]} 8 u32 words
 */
export function compress8(chainingValue, blockWords, counter, blockLen, flags) {
  const counterLow = counter | 0;
  const counterHigh = 0; // counter fits in 32 bits for our use case
  const state = [
    chainingValue[0], chainingValue[1], chainingValue[2], chainingValue[3],
    chainingValue[4], chainingValue[5], chainingValue[6], chainingValue[7],
    IV[0], IV[1], IV[2], IV[3],
    counterLow, counterHigh, blockLen, flags,
  ];

  for (let i = 0; i < 7; i++) {
    roundFixed(state, blockWords, i);
  }

  for (let i = 0; i < 8; i++) {
    state[i] ^= state[i + 8];
  }

  return state.slice(0, 8);
}

/**
 * Hash arbitrary data using BLAKE3 (single-chunk, up to 1024 bytes).
 * Returns 32-byte Uint8Array.
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function blake3Hash(data) {
  let chainingValue = IV.slice();

  // Process 64-byte blocks (at least 1 block even for empty input)
  const numBlocks = Math.max(1, Math.ceil(data.length / 64));
  for (let blockIdx = 0; blockIdx < numBlocks; blockIdx++) {
    const offset = blockIdx * 64;
    const remaining = Math.max(0, data.length - offset);
    const thisBlockLen = Math.min(64, remaining);

    // Convert block bytes to 16 u32 words (LE)
    const block = new Array(16).fill(0);
    for (let i = 0; i < thisBlockLen; i++) {
      block[i >> 2] |= data[offset + i] << ((i & 3) * 8);
    }

    let flags = 0;
    if (blockIdx === 0) flags |= FLAG_CHUNK_START;
    if (blockIdx === numBlocks - 1) flags |= FLAG_CHUNK_END | FLAG_ROOT;

    chainingValue = compress8(chainingValue, block, 0, thisBlockLen, flags);
  }

  // Convert u32 words to bytes (LE)
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = chainingValue[i] & 0xff;
    out[i * 4 + 1] = (chainingValue[i] >>> 8) & 0xff;
    out[i * 4 + 2] = (chainingValue[i] >>> 16) & 0xff;
    out[i * 4 + 3] = (chainingValue[i] >>> 24) & 0xff;
  }
  return out;
}

/**
 * Encode u32[8] hash to hex string (LE byte order, matching Rust encode_hex_le).
 * @param {number[]} hash - 8 u32 words
 * @returns {string}
 */
export function encodeHexLE(hash) {
  const hex = '0123456789abcdef';
  let out = '';
  for (let w = 0; w < 8; w++) {
    for (let i = 0; i < 4; i++) {
      const b = (hash[w] >>> (i * 8)) & 0xff;
      out += hex[b >> 4];
      out += hex[b & 0xf];
    }
  }
  return out;
}

/**
 * Compute the difficulty mask (matching Rust compute_mask_cerberus).
 * @param {number} difficulty
 * @returns {number}
 */
export function computeMask(difficulty) {
  if (difficulty === 16) return ~0;
  // !(!0u32 >> (difficulty * 2)).swap_bytes()
  const shifted = (~0 >>> (difficulty * 2)) | 0;
  const swapped = byteSwap32(shifted);
  return (~swapped) | 0;
}

function byteSwap32(v) {
  return (
    ((v & 0xff) << 24) |
    (((v >>> 8) & 0xff) << 16) |
    (((v >>> 16) & 0xff) << 8) |
    ((v >>> 24) & 0xff)
  ) | 0;
}
