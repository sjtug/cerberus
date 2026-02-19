import PowWorker from './pow.worker.js?worker&inline';
import PowJsWorker from './pow.js.worker.js?worker&inline';
import wasmUrlMvp from "pow-wasm-mvp/pow_mvp_bg.wasm?url";
import wasmUrlSimd from "pow-wasm-simd/pow_simd_bg.wasm?url";

const simdProbeModule = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 7,
  5, 1, 1, 102, 0, 0, 10, 22, 1, 20, 0, 253, 12, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 11,
]);

export const supportsWasm = () => {
  return WebAssembly && [WebAssembly.validate, WebAssembly.instantiate].every(i => typeof i == "function");
};

const supportsSimd = () => {
  if (!supportsWasm()) return false;
  try {
    return WebAssembly.validate(simdProbeModule);
  } catch {
    return false;
  }
};

export default async function process(
  data,
  difficulty = 5,
  signal = null,
  progressCallback = null,
  threads = (navigator.hardwareConcurrency || 1),
) {
  const workers = [];
  try {
    const useWasm = supportsWasm();
    let wasmModule = null;
    let WorkerClass;

    if (useWasm) {
      const hasSimd = supportsSimd();
      const wasmUrl = hasSimd ? wasmUrlSimd : wasmUrlMvp;
      wasmModule = await (await fetch(wasmUrl)).arrayBuffer();
      WorkerClass = PowWorker;
    } else {
      WorkerClass = PowJsWorker;
    }

    return await Promise.race(Array(threads).fill(0).map((i, idx) => new Promise((resolve, reject) => {
      const worker = new WorkerClass();
      worker.onmessage = ({ data }) => (typeof data === "number" ? progressCallback : resolve)?.(data);
      worker.onerror = reject;
      worker.postMessage({
        ...(useWasm ? { wasmModule } : {}),
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
