import PowWorker from './pow.worker.js?worker&inline';

export default async function process(
  data,
  difficulty = 5,
  signal = null,
  progressCallback = null,
  threads = (navigator.hardwareConcurrency || 1),
) {
  const workers = [];
  try {
    const wasmModule = await (await fetch(new URL('pow-wasm/pow_bg.wasm', import.meta.url))).arrayBuffer();
    return await Promise.race(Array(threads).fill(0).map((i, idx) => new Promise((resolve, reject) => {
      const worker = new PowWorker();
      worker.onmessage = ({ data }) => (typeof data === "number" ? progressCallback : resolve)?.(data);
      worker.onerror = reject;
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