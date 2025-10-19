mod utils;
use serde::Serialize;
use solver::Solver;
use utils::set_panic_hook;
use wasm_bindgen::prelude::*;
use web_sys::DedicatedWorkerGlobalScope;

mod blake3;

mod solver;

#[cold]
fn unlikely() {}

/// Compute a mask for a Cerberus PoW (mask & V[0] == 0)
pub const fn compute_mask_cerberus(difficulty_factor: core::num::NonZeroU8) -> u32 {
    if difficulty_factor.get() == 16 {
        return !0;
    }
    // Cerberus compares output as if it was big endian, but BLAKE3 outputs little endian
    // so a byte swap is needed for the correct significance order
    !(!0u32 >> (difficulty_factor.get() * 2)).swap_bytes()
}

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
pub type CerberusSolver = solver::simd128::CerberusSolver;
#[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
pub type CerberusSolver = solver::scalar::CerberusSolver;

/// Encode a blake3 hash into hex
fn encode_hex_le(out: &mut [u8; 64], inp: [u32; 8]) {
    for w in 0..8 {
        let le_bytes = inp[w].to_le_bytes();
        le_bytes.iter().enumerate().for_each(|(i, b)| {
            let high_nibble = b >> 4;
            let low_nibble = b & 0xf;
            out[w * 8 + i * 2] = if high_nibble < 10 {
                high_nibble + b'0'
            } else {
                high_nibble + b'a' - 10
            };
            out[w * 8 + i * 2 + 1] = if low_nibble < 10 {
                low_nibble + b'0'
            } else {
                low_nibble + b'a' - 10
            };
        });
    }
}

#[repr(align(64))]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Align to 64 bytes
pub struct Align64<T>(pub T);

impl<T> From<T> for Align64<T> {
    fn from(value: T) -> Self {
        Align64(value)
    }
}

impl<T> core::ops::Deref for Align64<T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> core::ops::DerefMut for Align64<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

fn worker_global_scope() -> DedicatedWorkerGlobalScope {
    let global = js_sys::global();
    global.dyn_into().expect("not running in a web worker")
}

#[derive(Debug, Serialize)]
struct Resp {
    hash: String,
    data: String,
    difficulty: u32,
    nonce: u64,
}

#[wasm_bindgen(start)]
fn start() {
    set_panic_hook();
}

/// A message in the cerberus format
///
/// Note cerberus official solver only supports 32-bit range nonces, but the validator accepts machine sized nonces and should always remain inter-block
///
/// Construct: Proof := (prefix || ASCII_GO_INT_DECIMAL(nonce))
#[derive(Debug, Clone)]
pub struct CerberusMessage {
    pub(crate) prefix_state: [u32; 8],
    pub(crate) salt_residual: [u8; 64],
    pub(crate) salt_residual_len: usize,
    pub(crate) flags: u32,
    pub(crate) nonce_addend: u64,
}

impl CerberusMessage {
    /// Create a new Ceberus message
    ///
    /// End-to-end salt construction: `${challenge}|${inputNonce}|${ts}|${signature}|`
    pub fn new(salt: &[u8], mut working_set: u32) -> Option<Self> {
        // nonce placement in blake3 is less important than sha256, both early and late salts have strategies to elide computation.
        //
        // so we will keep it in 32-bit range just in case we met a 32-bit server, but in practice this is rarely seen.
        //
        // u32::MAX is 4294967295 (10 digits), we will pop the first digit as outer loop and at most 3 other blocks need to be mutated
        // the last block is byte-order sensitive and needs a left shift to fix

        // actual tree-based hashing is not supported yet, it kicks in at 1024 bytes
        // we can leave 24 bytes of headroom for nonce maneuvering.
        //
        // Currently a typical challenge is 128 bytes or so, we are not near the 1024 byte threshold yet
        if salt.len() > 1000 {
            return None;
        }
        let mut chunks = salt.chunks_exact(64);
        let mut prefix_state = blake3::IV;
        let mut flags = blake3::FLAG_CHUNK_START | blake3::FLAG_CHUNK_END | blake3::FLAG_ROOT;

        for (i, block) in (&mut chunks).enumerate() {
            let block = core::array::from_fn(|i| {
                u32::from_le_bytes([
                    block[i * 4],
                    block[i * 4 + 1],
                    block[i * 4 + 2],
                    block[i * 4 + 3],
                ])
            });
            let this_flag = if i == 0 { blake3::FLAG_CHUNK_START } else { 0 };

            let output = blake3::compress8(&prefix_state, &block, 0, 64, this_flag);
            prefix_state.copy_from_slice(&output);
            flags &= !blake3::FLAG_CHUNK_START;
        }
        let remainder = chunks.remainder();
        let mut salt_residual = [0; 64];
        salt_residual[..remainder.len()].copy_from_slice(remainder);
        let mut ptr = remainder.len();

        let mut nonce_addend = 0;
        // TODO: figure out how to search more than 9G of nonce space for the edge case of 54 bytes modulo 64
        // this is far from the typical case for Cerberus so not very important (even the official solver only searches 4G of nonce space)
        if remainder.len() >= 55 {
            // not enough room for 9 digits, assume 64-bit server and pad generously
            let head_digit = (working_set % 8) as u8 + 1; // i64::MAX starts with 9 so we can only use 1-8 as head digit
            nonce_addend = head_digit as u64;
            salt_residual[remainder.len()] = head_digit as u8 + b'0';
            working_set /= 8;
            for x in (remainder.len() + 1)..64 {
                let digit = working_set % 10;
                salt_residual[x] = digit as u8 + b'0';
                nonce_addend *= 10;
                nonce_addend += digit as u64;
                working_set /= 10;
            }
            ptr = 0;
            let block = core::array::from_fn(|i| {
                u32::from_le_bytes([
                    salt_residual[i * 4],
                    salt_residual[i * 4 + 1],
                    salt_residual[i * 4 + 2],
                    salt_residual[i * 4 + 3],
                ])
            });

            let output = blake3::compress8(
                &prefix_state,
                &block,
                0,
                64,
                blake3::FLAG_CHUNK_START & flags,
            );
            prefix_state.copy_from_slice(&output);
            flags &= !blake3::FLAG_CHUNK_START;
            salt_residual.fill(0);
        }

        let head_digit = (working_set % 9) as u8 + 1;
        salt_residual[ptr] = head_digit as u8 + b'0';
        nonce_addend *= 10;
        nonce_addend += head_digit as u64;
        working_set /= 9;
        while working_set != 0 {
            ptr += 1;
            let digit = working_set % 10;
            salt_residual[ptr] = digit as u8 + b'0';
            nonce_addend *= 10;
            nonce_addend += digit as u64;
            working_set /= 10;
        }

        if ptr + 9 >= 64 {
            return None;
        }

        ptr += 1;

        for i in 0..9 {
            salt_residual[ptr + i] = b'0';
        }

        Some(Self {
            prefix_state,
            salt_residual_len: ptr,
            salt_residual,
            flags,
            nonce_addend: nonce_addend * 1_000_000_000,
        })
    }
}

#[wasm_bindgen]
pub fn process_task(data: &str, difficulty: u32, thread_id: u32, threads: u32) {
    let worker = worker_global_scope();

    let mask =
        compute_mask_cerberus(core::num::NonZeroU8::new(difficulty.try_into().unwrap()).unwrap());

    let mut set = thread_id;

    loop {
        let Some(message) = CerberusMessage::new(data.as_bytes(), set) else {
            return;
        };
        let mut solver = CerberusSolver::from(message);
        solver.set_report_slot(thread_id, threads);

        let Some((nonce, hash)) = solver.solve(mask, |nonce| {
            worker
                .post_message(&JsValue::from_f64(f64::from(nonce)))
                .expect("Failed to send message");
        }) else {
            if let Some(new_set) = set.checked_add(threads) {
                set = new_set;
                continue;
            } else {
                return;
            }
        };

        let attempt = format!("{}{}", data, nonce);
        let mut hash_hex = [0; 64];
        encode_hex_le(&mut hash_hex, hash);
        let resp = Resp {
            hash: String::from_utf8(hash_hex.to_vec()).unwrap(),
            data: attempt,
            difficulty,
            nonce,
        };
        worker
            .post_message(
                &serde_wasm_bindgen::to_value(&resp).expect("Failed to serialize response"),
            )
            .expect("Failed to send message");
        return;
    }
}
