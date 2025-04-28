// This file contains code adapted from https://github.com/TecharoHQ/anubis under the MIT License.

import pow from "./pow.mjs";

class VerificationUI {
  static state = {
    baseURL: '',
    version: 'unknown'
  };

  static elements = {
    title: null,
    mascot: null,
    status: null,
    metrics: null,
    message: null,
    progressContainer: null,
    progressBar: null
  };

  static initialize(config) {
    this.state = {
      ...this.state,
      ...config
    };

    // Cache DOM elements
    this.elements = {
      title: document.getElementById('title'),
      mascot: document.getElementById('mascot'),
      status: document.getElementById('status'),
      metrics: document.getElementById('metrics'),
      message: document.getElementById('message'),
      progressContainer: document.getElementById('progress-container'),
      progressBar: document.getElementById('progress-bar')
    };
  }

  static setState(state, data = {}) {
    switch (state) {
      case 'checking':
        this.setChecking(data);
        break;
      case 'success':
        this.setSuccess(data);
        break;
    }
  }

  static setChecking(data) {
    this.elements.title.textContent = data.title || "Making sure you're not a bot!";
    this.elements.mascot.src = `${this.state.baseURL}/static/img/mascot-puzzle.png?v=${this.state.version}`;
    this.elements.status.textContent = data.status || 'Calculating...';
    this.elements.progressContainer.classList.remove('hidden');
    this.setCheckingProgress(data.progress, data.metrics, data.message);
  }

  static setCheckingProgress(percent, metrics, message) {
    if (percent !== undefined) {
      this.elements.progressBar.style.width = `${percent}%`;
    }
    if (metrics !== undefined) {
      if (metrics === "") {
        this.elements.metrics.classList.add('hidden');
      } else {
        this.elements.metrics.classList.remove('hidden');
        this.elements.metrics.textContent = metrics;
      }
    }
    if (message !== undefined) {
      this.elements.message.textContent = message;
    }
  }

  static setSuccess(data) {
    this.elements.title.textContent = 'Success!';
    this.elements.mascot.src = `${this.state.baseURL}/static/img/mascot-pass.png?v=${this.state.version}`;
    this.elements.status.textContent = data.status || 'Done!';
    this.elements.metrics.textContent = data.metrics || 'Took ?, ? iterations';
    this.elements.message.textContent = data.message || '';
    this.elements.progressContainer.classList.add('hidden');
  }
}

function createAnswerForm(hash, solution, baseURL, nonce, ts, signature) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${baseURL}/answer`;

  const responseInput = document.createElement('input');
  responseInput.type = 'hidden';
  responseInput.name = 'response';
  responseInput.value = hash;

  const solutionInput = document.createElement('input');
  solutionInput.type = 'hidden';
  solutionInput.name = 'solution';
  solutionInput.value = solution;

  const nonceInput = document.createElement('input');
  nonceInput.type = 'hidden';
  nonceInput.name = 'nonce';
  nonceInput.value = nonce;

  const tsInput = document.createElement('input');
  tsInput.type = 'hidden';
  tsInput.name = 'ts';
  tsInput.value = ts;

  const signatureInput = document.createElement('input');
  signatureInput.type = 'hidden';
  signatureInput.name = 'signature';
  signatureInput.value = signature;

  const redirInput = document.createElement('input');
  redirInput.type = 'hidden';
  redirInput.name = 'redir';
  redirInput.value = window.location.href;

  form.appendChild(responseInput);
  form.appendChild(solutionInput);
  form.appendChild(nonceInput);
  form.appendChild(tsInput);
  form.appendChild(signatureInput);
  form.appendChild(redirInput);
  document.body.appendChild(form);

  return form;
}

(async () => {
  // const image = document.getElementById('image');
  // const spinner = document.getElementById('spinner');
  // const anubisVersion = JSON.parse(document.getElementById('anubis_version').textContent);

  const challenge = JSON.parse(document.getElementById('challenge').textContent);
  const difficulty = JSON.parse(document.getElementById('difficulty').textContent);
  const baseURL = JSON.parse(document.getElementById('baseURL').textContent);
  const version = JSON.parse(document.getElementById('version').textContent);
  const inputNonce = JSON.parse(document.getElementById('nonce').textContent);
  const ts = JSON.parse(document.getElementById('ts').textContent);
  const signature = JSON.parse(document.getElementById('signature').textContent);

  // Initialize VerificationUI with configuration
  VerificationUI.initialize({
    baseURL,
    version
  });

  // Set initial checking state
  VerificationUI.setState('checking', {
    metrics: `Difficulty: ${difficulty}, Speed: calculating...`,
    message: ""
  });

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
      VerificationUI.setCheckingProgress(
        distance,
        `Difficulty: ${difficulty}, Speed: ${speed.toFixed(3)}kH/s`,
        probability < 0.01 ? 'This is taking longer than expected. Please do not refresh the page.' : undefined
      );
      lastUpdate = delta;
    };
  });
  const t1 = Date.now();
  console.log({ hash, solution });

  // Show success state
  VerificationUI.setState('success', {
    status: 'Verification Complete!',
    metrics: `Took ${t1 - t0}ms, ${solution} iterations`
  });

  const form = createAnswerForm(hash, solution, baseURL, inputNonce, ts, signature);
  setTimeout(() => {
    form.submit();
  }, 250);

})();