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

fn worker_global_scope() -> DedicatedWorkerGlobalScope {
    let global = js_sys::global();
    global.dyn_into().expect("not running in a web worker")
}

#[derive(Debug, Serialize)]
struct Resp {
    hash: String,
    difficulty: u32,
    nonce: u64,
}

#[wasm_bindgen(start)]
fn start() {
    set_panic_hook();
}

/// A message in the cerberus format
#[derive(Debug, Clone)]
pub struct CerberusMessage {
    pub(crate) midstate: [u32; 8],
    pub(crate) batch_id: u32,
}

impl CerberusMessage {
    /// The flags for the trailing block
    pub const fn trailing_block_flags(&self) -> u32 {
        blake3::FLAG_CHUNK_END | blake3::FLAG_ROOT
    }

    /// Create a new Ceberus message
    pub fn new(salt: &[u8; 64], thread_id: u32) -> Option<Self> {
        let mut init_block = [0; 16];
        for i in 0..16 {
            init_block[i] = u32::from_le_bytes([
                salt[i * 4],
                salt[i * 4 + 1],
                salt[i * 4 + 2],
                salt[i * 4 + 3],
            ]);
        }

        let midstate = blake3::compress8(
            &blake3::IV,
            &init_block,
            0,
            salt.len() as u32,
            blake3::FLAG_CHUNK_START,
        );

        Some(Self {
            midstate,
            batch_id: thread_id,
        })
    }
}

#[wasm_bindgen]
pub fn process_task(data: &str, difficulty: u32, thread_id: u32, threads: u32) {
    let worker = worker_global_scope();

    let mask =
        compute_mask_cerberus(core::num::NonZeroU8::new(difficulty.try_into().unwrap()).unwrap());

    let mut set = thread_id;

    let salt_hex = ::blake3::hash(data.as_bytes()).to_hex();

    loop {
        let Some(message) = CerberusMessage::new(salt_hex.as_bytes().try_into().unwrap(), set)
        else {
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

        let mut hash_hex = [0; 64];
        encode_hex_le(&mut hash_hex, hash);
        let resp = Resp {
            hash: String::from_utf8(hash_hex.to_vec()).unwrap(),
            difficulty,
            nonce: nonce[1] as u64 | (nonce[0] as u64) << 32,
        };
        worker
            .post_message(
                &serde_wasm_bindgen::to_value(&resp).expect("Failed to serialize response"),
            )
            .expect("Failed to send message");
        return;
    }
}
