import { initSync, process_task } from "pow-wasm";

addEventListener('message', (event) => {
    // NOTE errors are not bubbled up if you change this to async
    try {
        initSync({ module: event.data.wasmModule });
    } catch (e) {
        throw new Error("Failed to initialize WebAssembly module", { cause: e });
    }
    process_task(event.data.data, event.data.difficulty, event.data.nonce, event.data.threads);
});
