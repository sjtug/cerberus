mod check_nibble;
mod utils;

use blake3::Hasher;
use check_nibble::check_leading_zero_nibbles;
use serde::Serialize;
use utils::set_panic_hook;
use wasm_bindgen::prelude::*;
use web_sys::DedicatedWorkerGlobalScope;

fn worker_global_scope() -> DedicatedWorkerGlobalScope {
    let global = js_sys::global();
    global.dyn_into().expect("not running in a web worker")
}

#[derive(Debug, Serialize)]
struct Resp {
    hash: String,
    data: String,
    difficulty: u32,
    nonce: u32,
}

#[wasm_bindgen(start)]
fn start() {
    set_panic_hook();
}

#[wasm_bindgen]
pub fn process_task(data: &str, difficulty: u32, thread_id: u32, threads: u32) {
    let worker = worker_global_scope();

    let nibble_checker = check_leading_zero_nibbles(difficulty as usize);

    let mut hasher = Hasher::new();

    for i in (thread_id..).step_by(threads as usize) {
        hasher.reset();

        let attempt = format!("{}{}", data, i);
        hasher.update(attempt.as_bytes());
        let hash = hasher.finalize();

        if nibble_checker(hash.as_bytes(), difficulty as usize) {
            let resp = Resp {
                hash: hex::encode(hash.as_bytes()),
                data: attempt,
                difficulty,
                nonce: i,
            };
            worker
                .post_message(
                    &serde_wasm_bindgen::to_value(&resp).expect("Failed to serialize response"),
                )
                .expect("Failed to send message");
            return;
        }

        // send a progress update every 1023 iterations. since each thread checks
        // separate values, one simple way to do this is by bit masking the
        // nonce for multiples of 1023. unfortunately, if the number of threads
        // is not prime, only some of the threads will be sending the status
        // update and they will get behind the others. this is slightly more
        // complicated but ensures an even distribution between threads.
        if i + threads > i | 8191 && (i >> 13) % threads == thread_id {
            worker
                .post_message(&JsValue::from_f64(f64::from(i)))
                .expect("Failed to send message");
        }
    }
}
