import { serializeError } from './worker-error.mjs';
import { initSync, process_task } from "pow-wasm";

function sendError(error) {
    postMessage({
        type: 'error',
        error: serializeError(error),
    });
}

addEventListener('message', (event) => {
    try {
        try {
            initSync({ module: event.data.wasmModule });
        } catch (error) {
            throw new Error("Failed to initialize WebAssembly module", { cause: error });
        }

        process_task(event.data.data, event.data.difficulty, event.data.nonce, event.data.threads);
    } catch (error) {
        sendError(error);
        close();
    }
});
