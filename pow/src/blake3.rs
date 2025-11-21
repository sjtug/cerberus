//! Single chunk implementation of BLAKE3
//! https://github.com/C2SP/C2SP/blob/72cc8fe15c9290bc7814dcfd5e4f1ea5d2f66e75/BLAKE3.md
#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
pub mod simd128;

#[macro_use]
mod loop_macros;

/// Initial hash values for BLAKE3
pub(crate) const IV: [u32; 8] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];
pub(crate) const FLAG_CHUNK_START: u32 = 0x01;
pub(crate) const FLAG_CHUNK_END: u32 = 0x02;
#[expect(unused, reason = "TODO, maybe never going to need this")]
pub(crate) const FLAG_PARENT: u32 = 0x04;
pub(crate) const FLAG_ROOT: u32 = 0x08;

const PERMUTATION: [usize; 16] = [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8];

const MESSAGE_SCHEDULE: [[usize; 16]; 7] = {
    let mut ix = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    let mut out = [ix; 7];

    let mut i = 1;
    while i < 7 {
        let mut j = 0;
        let mut new_ix = [0; 16];
        while j < 16 {
            new_ix[j] = ix[PERMUTATION[j]];
            j += 1;
        }
        ix = new_ix;
        out[i] = new_ix;
        i += 1;
    }

    out
};

// The mixing function, G, which mixes either a column or a diagonal.
#[inline(always)]
fn g(state: &mut [u32; 16], a: usize, b: usize, c: usize, d: usize, mx: u32, my: u32) {
    state[a] = state[a].wrapping_add(state[b]).wrapping_add(mx);
    state[d] = (state[d] ^ state[a]).rotate_right(16);
    state[c] = state[c].wrapping_add(state[d]);
    state[b] = (state[b] ^ state[c]).rotate_right(12);
    state[a] = state[a].wrapping_add(state[b]).wrapping_add(my);
    state[d] = (state[d] ^ state[a]).rotate_right(8);
    state[c] = state[c].wrapping_add(state[d]);
    state[b] = (state[b] ^ state[c]).rotate_right(7);
}

#[inline(always)]
fn round_fixed(state: &mut [u32; 16], m: &[u32; 16], round: usize) {
    // Mix the columns.
    g(
        state,
        0,
        4,
        8,
        12,
        m[MESSAGE_SCHEDULE[round][0]],
        m[MESSAGE_SCHEDULE[round][1]],
    );
    g(
        state,
        1,
        5,
        9,
        13,
        m[MESSAGE_SCHEDULE[round][2]],
        m[MESSAGE_SCHEDULE[round][3]],
    );
    g(
        state,
        2,
        6,
        10,
        14,
        m[MESSAGE_SCHEDULE[round][4]],
        m[MESSAGE_SCHEDULE[round][5]],
    );
    g(
        state,
        3,
        7,
        11,
        15,
        m[MESSAGE_SCHEDULE[round][6]],
        m[MESSAGE_SCHEDULE[round][7]],
    );
    // Mix the diagonals.
    g(
        state,
        0,
        5,
        10,
        15,
        m[MESSAGE_SCHEDULE[round][8]],
        m[MESSAGE_SCHEDULE[round][9]],
    );
    g(
        state,
        1,
        6,
        11,
        12,
        m[MESSAGE_SCHEDULE[round][10]],
        m[MESSAGE_SCHEDULE[round][11]],
    );
    g(
        state,
        2,
        7,
        8,
        13,
        m[MESSAGE_SCHEDULE[round][12]],
        m[MESSAGE_SCHEDULE[round][13]],
    );
    g(
        state,
        3,
        4,
        9,
        14,
        m[MESSAGE_SCHEDULE[round][14]],
        m[MESSAGE_SCHEDULE[round][15]],
    );
}

#[cfg_attr(
    not(all(target_arch = "wasm32", target_feature = "simd128")),
    allow(unused, reason = "for SIMD128 only")
)]
pub const fn setup_block(state: [u32; 8], counter: u64, block_len: u32, flags: u32) -> [u32; 16] {
    [
        state[0],
        state[1],
        state[2],
        state[3],
        state[4],
        state[5],
        state[6],
        state[7],
        IV[0],
        IV[1],
        IV[2],
        IV[3],
        counter as u32,
        0,
        block_len,
        flags,
    ]
}

#[inline(always)]
/// Truncated BLAKE3 compression function.
pub fn compress8(
    chaining_value: &[u32; 8],
    block_words: &[u32; 16],
    counter: u64,
    block_len: u32,
    flags: u32,
) -> [u32; 8] {
    let counter_low = counter as u32;
    let counter_high = (counter >> 32) as u32;
    #[rustfmt::skip]
    let mut state = [
        chaining_value[0], chaining_value[1], chaining_value[2], chaining_value[3],
        chaining_value[4], chaining_value[5], chaining_value[6], chaining_value[7],
        IV[0],             IV[1],             IV[2],             IV[3],
        counter_low,       counter_high,      block_len,         flags,
    ];
    let block = *block_words;

    repeat!(7; i, {
        round_fixed(&mut state, &block, i);
    });

    for i in 0..8 {
        state[i] ^= state[i + 8];
    }
    state[..8].try_into().unwrap()
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_compress_unchained() {
        for blockc in 1..=4 {
            let mut chaining_value = IV;

            let mut msg = Vec::new();
            let mut ctr = 0usize;
            while msg.len() < 64 * blockc {
                let mut hasher = blake3::Hasher::new();
                hasher.update(ctr.to_le_bytes().as_slice());
                let hash = hasher.finalize();
                msg.extend_from_slice(hash.as_bytes());
                ctr = ctr.wrapping_add(1);
            }
            assert_eq!(msg.len(), 64 * blockc);

            let mut reference_hasher = blake3::Hasher::new();
            reference_hasher.update(&msg);
            let hash = reference_hasher.finalize();
            let hash = hash.as_bytes();

            let count_chunks = msg.len().div_ceil(64);
            ctr = 0;
            let mut chunks = msg.chunks_exact(64);
            let mut output = [0u32; 8];
            while let Some(chunk) = chunks.next() {
                let block = core::array::from_fn(|i| {
                    u32::from_le_bytes(chunk[i * 4..i * 4 + 4].try_into().unwrap())
                });

                let this_flag = if ctr == 0 { FLAG_CHUNK_START } else { 0 }
                    | if count_chunks == ctr + 1 {
                        FLAG_CHUNK_END | FLAG_ROOT
                    } else {
                        0
                    };
                output = compress8(&chaining_value, &block, 0, 64, this_flag);
                chaining_value = output;
                ctr += 1;
            }

            let output: [u32; 8] = output[..8].try_into().unwrap();
            let mut expected = [0u32; 8];
            for i in 0..8 {
                expected[i] = u32::from_le_bytes(hash[i * 4..i * 4 + 4].try_into().unwrap());
            }
            assert_eq!(output, expected, "output mismatch (blockc: {})", blockc);
        }
    }
}
