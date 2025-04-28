// This file contains code adapted from https://github.com/TecharoHQ/anubis under the MIT License.
import wasm from 'url:../../pow/pkg/pow_bg.wasm';

export default async function process(
  data,
  difficulty = 5,
  signal = null,
  progressCallback = null,
  threads = (navigator.hardwareConcurrency || 1),
) {
  return new Promise((resolve, reject) => {
    console.debug("fast algo");
    const workers = [];
    const terminate = () => {
      workers.forEach((w) => w.terminate());
      if (signal !== null) {
        // clean up listener to avoid memory leak
        signal.removeEventListener("abort", terminate);
        if (signal.aborted) {
          console.log("PoW aborted");
          reject(new Error("PoW aborted"));
        }
      }
    };
    if (signal !== null) {
      signal.addEventListener("abort", terminate, { once: true });
    }

    (async () => {
      const wasmModule = await (await fetch(wasm)).arrayBuffer();

      for (let i = 0; i < threads; i++) {
        let worker = new Worker(new URL("./pow.worker.js", import.meta.url), { type: "module" });

        worker.onmessage = (event) => {
          if (typeof event.data === "number") {
            progressCallback?.(event.data);
          } else {
            terminate();
            resolve(event.data);
          }
        };

        worker.onerror = (event) => {
          terminate();
          reject(event);
        };

        worker.postMessage({
          wasmModule,
          data,
          difficulty,
          nonce: i,
          threads,
        });

        workers.push(worker);
      }
    })();
  });
}