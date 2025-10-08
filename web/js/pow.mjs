import PowWorker from './pow.worker.js?worker&inline';
import { deserializeError } from './worker-error.mjs';
import wasmUrl from "pow-wasm/pow_bg.wasm?url";

export default async function process(
  data,
  difficulty = 5,
  signal = null,
  progressCallback = null,
  threads = (navigator.hardwareConcurrency || 1),
) {
  const workers = [];
  try {
    const wasmModule = await (await fetch(wasmUrl)).arrayBuffer();
    return await Promise.race(Array(threads).fill(0).map((i, idx) => new Promise((resolve, reject) => {
      const worker = new PowWorker();
      worker.onmessage = ({ data }) => {
        if (data && typeof data === 'object' && data.type === 'error') {
          reject(deserializeError(data.error));
          return;
        }

        if (typeof data === 'number') {
          progressCallback?.(data);
          return;
        }

        resolve?.(data);
      };
      worker.postMessage({
        wasmModule,
        data,
        difficulty,
        nonce: idx,
        threads,
      });
      signal?.addEventListener("abort", () => reject(new Error("PoW aborted")), { once: true });
      workers.push(worker);
    })));
  } finally {
    workers.forEach((w) => w.terminate());
  }
}
