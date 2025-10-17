// This file contains code adapted from https://github.com/TecharoHQ/anubis under the MIT License.

import pow from "./pow.mjs";
import * as telemetry from "./telemetry.mjs";
import Messages from "@messageformat/runtime/messages";
import msgData from "./icu/compiled.mjs";
import mascotPass from "../img/mascot-pass.png";
import mascotFail from "../img/mascot-fail.png";
import mascotPuzzle from "../img/mascot-puzzle.png";

const messages = new Messages(msgData);

function t(key, props) {
  return messages.get(key.split("."), props);
}

const dom = {
  root: document.documentElement,
  mainArea: document.getElementById("main-area"),
  title: document.getElementById("title"),
  mascot: document.getElementById("mascot"),
  status: document.getElementById("status"),
  metrics: document.getElementById("metrics"),
  progressMessage: document.getElementById("progress-message"),
  progressContainer: document.getElementById("progress-container"),
  progressBar: document.getElementById("progress-bar"),
  messageArea: document.getElementById("message-area"),
  message: document.getElementById("message"),
  description: document.getElementById("description"),
  code: document.getElementById("code"),
};

const ui = {
  init: () => {
    dom.root.classList.remove("noscript-hidden");
  },
  areaMode: (mode) => {
    if (mode === "progress") {
      dom.mainArea.classList.remove("hidden");
      dom.messageArea.classList.add("noscript");
    } else if (mode === "message") {
      dom.mainArea.classList.add("hidden");
      dom.messageArea.classList.remove("noscript");
    }
  },
  title: (title) => (dom.title.textContent = title),
  mascotState: (state) =>
    (dom.mascot.src =
      state === "pass"
        ? mascotPass
        : state === "fail"
          ? mascotFail
          : mascotPuzzle),
  status: (status) => (dom.status.textContent = status),
  metrics: (metrics) => (dom.metrics.textContent = metrics),
  progressMessage: (message) => (dom.progressMessage.textContent = message),
  progress: (progress) => {
    dom.progressContainer.classList.toggle("hidden", !progress);
    dom.progressBar.style.width = `${progress}%`;
  },
  message: (message) => (dom.message.textContent = message),
  description: (description) => (dom.description.textContent = description),
  code: (code) => {
    dom.code.classList.toggle("hidden!", !code);
    dom.code.textContent = code;
  },
};

function createAnswerForm(hash, solution, baseURL, nonce, ts, signature) {
  function addHiddenInput(form, name, value) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${baseURL}/answer`;

  addHiddenInput(form, "response", hash);
  addHiddenInput(form, "solution", solution);
  addHiddenInput(form, "nonce", nonce);
  addHiddenInput(form, "ts", ts);
  addHiddenInput(form, "signature", signature);
  addHiddenInput(form, "redir", window.location.href);

  document.body.appendChild(form);
  return form;
}

const handleError = (error, metaConfig) => {
  ui.areaMode("message");
  ui.title(t("error.error_occurred"));
  ui.mascotState("fail");

  let errorType = "unknown_error";
  if (
    error.message &&
    error.message.includes("Failed to initialize WebAssembly module")
  ) {
    ui.message(t("error.must_enable_wasm"));
    ui.description(t("error.apologize_please_enable_wasm"));
    errorType = "wasm_not_supported";
  } else {
    ui.message(t("error.client_error"));
    ui.description(t("error.browser_config_or_bug"));
    ui.code(t("error.error_details", { error: error.message }));
    errorType = "client_error";
  }

  // Capture error for telemetry if enabled
  if (metaConfig && metaConfig.telemetryDSN) {
    // Check if we should show consent dialog
    if (!telemetry.hasConsent()) {
      telemetry.showConsentDialog(
        () => {
          // User accepted, capture the error
          telemetry.captureError(error, {
            error_type: errorType,
            user_agent: navigator.userAgent,
            request_id: metaConfig.requestID,
          });
        },
        () => {
          // User declined, do nothing
        },
      );
    } else {
      // Already have consent, capture the error
      telemetry.captureError(error, {
        error_type: errorType,
        user_agent: navigator.userAgent,
        request_id: metaConfig.requestID,
      });
    }
  }
};

const main = async () => {
  const thisScript = document.getElementById("challenge-script");
  const {
    challenge,
    difficulty,
    nonce: inputNonce,
    ts,
    signature,
  } = JSON.parse(thisScript.getAttribute("x-challenge"));
  const metaConfig = JSON.parse(thisScript.getAttribute("x-meta"));
  const { baseURL, locale } = metaConfig;

  // Set locale
  messages.locale = locale;

  // Initialize telemetry if configured
  if (metaConfig.telemetryDSN) {
    await telemetry.initTelemetry(metaConfig);
  }

  // Set initial checking state
  ui.init();
  ui.areaMode("progress");
  ui.title(t("challenge.title"));
  ui.mascotState("puzzle");
  ui.status(t("challenge.calculating"));
  ui.metrics(t("challenge.difficulty_speed", { difficulty, speed: 0 }));
  ui.progressMessage("");
  ui.progress(0);

  const t0 = Date.now();
  let lastUpdate = 0;

  const likelihood = Math.pow(16, -difficulty / 2);

  const mergedChallenge = `${challenge}|${inputNonce}|${ts}|${signature}|`;
  const { hash, nonce: solution } = await pow(
    mergedChallenge,
    difficulty,
    null,
    (iters) => {
      // the probability of still being on the page is (1 - likelihood) ^ iters.
      // by definition, half of the time the progress bar only gets to half, so
      // apply a polynomial ease-out function to move faster in the beginning
      // and then slow down as things get increasingly unlikely. quadratic felt
      // the best in testing, but this may need adjustment in the future.
      const probability = Math.pow(1 - likelihood, iters);
      const distance = (1 - Math.pow(probability, 2)) * 100;

      // Update progress every 200ms
      const now = Date.now();
      const delta = now - t0;

      if (delta - lastUpdate > 200) {
        const speed = iters / delta;
        ui.progress(distance);
        ui.metrics(
          t("challenge.difficulty_speed", {
            difficulty,
            speed: speed.toFixed(3),
          }),
        );
        ui.progressMessage(
          probability < 0.01 ? t("challenge.taking_longer") : undefined,
        );
        lastUpdate = delta;
      }
    },
  );
  const t1 = Date.now();

  // Show success state
  ui.title(t("success.title"));
  ui.mascotState("pass");
  ui.status(t("success.verification_complete"));
  ui.metrics(
    t("success.took_time_iterations", { time: t1 - t0, iterations: solution }),
  );
  ui.progressMessage("");
  ui.progress(0);

  const form = createAnswerForm(
    hash,
    solution,
    baseURL,
    inputNonce,
    ts,
    signature,
  );
  setTimeout(() => {
    form.submit();
  }, 250);
};

main().catch((error) => {
  // Try to get metaConfig from the script tag for error handling
  const thisScript = document.getElementById("challenge-script");
  let metaConfig = {};
  try {
    metaConfig = JSON.parse(thisScript.getAttribute("x-meta"));
  } catch (e) {
    // If we can't parse meta config, just proceed without telemetry
  }
  handleError(error, metaConfig);
});
