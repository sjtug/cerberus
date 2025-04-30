import { initSync, process_task } from "pow-wasm";

addEventListener('message', async (event) => {
    initSync({ module: event.data.wasmModule });
    process_task(event.data.data, event.data.difficulty, event.data.nonce, event.data.threads);
});
