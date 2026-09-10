import { initSync as initMvp, process_task as processMvp } from "pow-wasm-mvp";
import { initSync as initSimd, process_task as processSimd } from "pow-wasm-simd";

addEventListener('message', (event) => {
    // Each wasm-bindgen module needs the bindings generated for that binary;
    // the MVP and SIMD builds use different import namespaces.
    const initSync = event.data.hasSimd ? initSimd : initMvp;
    const process_task = event.data.hasSimd ? processSimd : processMvp;
    // NOTE errors are not bubbled up if you change this to async
    try {
        initSync({ module: event.data.wasmModule });
    } catch (e) {
        throw new Error("Failed to initialize WebAssembly module", { cause: e });
    }
    process_task(event.data.data, event.data.difficulty, event.data.nonce, event.data.threads);
});
