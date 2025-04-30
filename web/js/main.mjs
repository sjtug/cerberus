// This file contains code adapted from https://github.com/TecharoHQ/anubis under the MIT License.

import pow from "./pow.mjs";
import Messages from "@messageformat/runtime/messages"
import msgData from "./icu/compiled.mjs"

const messages = new Messages(msgData)
console.log(messages.locale, messages.availableLocales);

function t(key, props) {
  return messages.get(key.split('.'), props)
}

const meta = {
  baseURL: "",
  version: "",
  locale: ""
}

const dom = {
  title: document.getElementById('title'),
  mascot: document.getElementById('mascot'),
  status: document.getElementById('status'),
  metrics: document.getElementById('metrics'),
  message: document.getElementById('message'),
  progressContainer: document.getElementById('progress-container'),
  progressBar: document.getElementById('progress-bar')
}

const ui = {
  title: (title) => dom.title.textContent = title,
  mascotState: (state) => dom.mascot.src = `${meta.baseURL}/static/img/mascot-${state}.png?v=${meta.version}`,
  status: (status) => dom.status.textContent = status,
  metrics: (metrics) => dom.metrics.textContent = metrics,
  message: (message) => dom.message.textContent = message,
  progress: (progress) => {
    dom.progressContainer.classList.toggle('hidden', !progress);
    dom.progressBar.style.width = `${progress}%`;
  }
}

function createAnswerForm(hash, solution, baseURL, nonce, ts, signature) {
  function addHiddenInput(form, name, value) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${baseURL}/answer`;

  addHiddenInput(form, 'response', hash);
  addHiddenInput(form, 'solution', solution);
  addHiddenInput(form, 'nonce', nonce);
  addHiddenInput(form, 'ts', ts);
  addHiddenInput(form, 'signature', signature);
  addHiddenInput(form, 'redir', window.location.href);

  document.body.appendChild(form);
  return form;
}

(async () => {
  // const image = document.getElementById('image');
  // const spinner = document.getElementById('spinner');
  // const anubisVersion = JSON.parse(document.getElementById('anubis_version').textContent);

  const thisScript = document.getElementById('challenge-script');
  const { challenge, difficulty, nonce: inputNonce, ts, signature } = JSON.parse(thisScript.getAttribute('x-challenge'));
  const { baseURL, version, locale } = JSON.parse(thisScript.getAttribute('x-meta'));

  // Initialize UI
  meta.baseURL = baseURL;
  meta.version = version;
  meta.locale = locale;

  // Set locale
  messages.locale = locale;

  // Set initial checking state
  ui.title(t('challenge.title'));
  ui.mascotState('puzzle');
  ui.status(t('challenge.calculating'));
  ui.metrics(t('challenge.difficulty_speed', { difficulty, speed: 0 }));
  ui.message('');
  ui.progress(0);

  const t0 = Date.now();
  let lastUpdate = 0;

  const likelihood = Math.pow(16, -difficulty/2);

  const mergedChallenge = `${challenge}|${inputNonce}|${ts}|${signature}|`;
  const { hash, nonce: solution } = await pow(mergedChallenge, difficulty, null, (iters) => {
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
      ui.metrics(t('challenge.difficulty_speed', { difficulty, speed: speed.toFixed(3) }));
      ui.message(probability < 0.01 ? t('challenge.taking_longer') : undefined);
      lastUpdate = delta;
    };
  });
  const t1 = Date.now();
  console.log({ hash, solution });

  // Show success state
  ui.title(t('success.title'));
  ui.mascotState('pass');
  ui.status(t('success.verification_complete'));
  ui.metrics(t('success.took_time_iterations', { time: t1 - t0, iterations: solution }));
  ui.message('');
  ui.progress(0);

  const form = createAnswerForm(hash, solution, baseURL, inputNonce, ts, signature);
  setTimeout(() => {
    form.submit();
  }, 250);

})();