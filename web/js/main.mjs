// This file contains code adapted from https://github.com/TecharoHQ/anubis under the MIT License.

import pow from "./pow.mjs";

const meta = {
  baseURL: "",
  version: ""
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
  const { baseURL, version } = JSON.parse(thisScript.getAttribute('x-meta'));

  // Initialize UI
  meta.baseURL = baseURL;
  meta.version = version;

  // Set initial checking state
  ui.title('Making sure you\'re not a bot!');
  ui.mascotState('puzzle');
  ui.status('Calculating...');
  ui.metrics(`Difficulty: ${difficulty}, Speed: calculating...`);
  ui.message('');
  ui.progress(0);

  const t0 = Date.now();
  let lastUpdate = 0;

  const likelihood = Math.pow(16, -difficulty);

  const mergedChallenge = `${challenge}|${inputNonce}|${ts}|${signature}|`;
  const { hash, nonce: solution } = await pow(mergedChallenge, difficulty, null, (iters) => {
    // the probability of still being on the page is (1 - likelihood) ^ iters.
    // by definition, half of the time the progress bar only gets to half, so
    // apply a polynomial ease-out function to move faster in the beginning
    // and then slow down as things get increasingly unlikely. quadratic felt
    // the best in testing, but this may need adjustment in the future.
    const probability = Math.pow(1 - likelihood, iters);
    const distance = (1 - Math.pow(probability, 2)) * 100;

    // Update progress every 100ms
    const now = Date.now();
    const delta = now - t0;

    if (delta - lastUpdate > 100) {
      const speed = iters / delta;
      ui.progress(distance);
      ui.metrics(`Difficulty: ${difficulty}, Speed: ${speed.toFixed(3)}kH/s`);
      ui.message(probability < 0.01 ? 'This is taking longer than expected. Please do not refresh the page.' : undefined);
      lastUpdate = delta;
    };
  });
  const t1 = Date.now();
  console.log({ hash, solution });

  // Show success state
  ui.title('Success!');
  ui.mascotState('pass');
  ui.status('Verification Complete!');
  ui.metrics(`Took ${t1 - t0}ms, ${solution} iterations`);
  ui.message('');
  ui.progress(0);

  const form = createAnswerForm(hash, solution, baseURL, inputNonce, ts, signature);
  setTimeout(() => {
    form.submit();
  }, 250);

})();