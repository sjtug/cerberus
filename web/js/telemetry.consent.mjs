// Handles consent state and UI for telemetry collection

const CONSENT_STORAGE_KEY = 'cerberus_telemetry_consent';

const consentState = {
  granted: readStoredConsent(),
  sessionDeclined: false,
};

let consentPromptActive = false;
let consentDecisionPromise = null;
const consentDecisionResolvers = [];

export function hasConsent() {
  return consentState.granted;
}

export function setConsent(granted) {
  consentState.granted = granted;
  consentState.sessionDeclined = !granted;
  consentPromptActive = false;
  writeStoredConsent(granted);
  resolveConsentWaiters(granted);
}

export function showConsentDialog(onAccept, onDecline) {
  if (consentState.sessionDeclined || consentPromptActive) {
    return false;
  }

  const overlay = document.getElementById('telemetry-consent-overlay');
  const acceptButton = document.getElementById('telemetry-accept');
  const declineButton = document.getElementById('telemetry-decline');

  if (!overlay || !acceptButton || !declineButton) {
    console.warn('Telemetry consent dialog not found in DOM');
    return false;
  }

  const cleanup = () => {
    overlay.classList.add('hidden');
    acceptButton.removeEventListener('click', handleAccept);
    declineButton.removeEventListener('click', handleDecline);
    consentPromptActive = false;
  };

  const handleAccept = () => {
    setConsent(true);
    cleanup();
    if (onAccept) onAccept();
  };

  const handleDecline = () => {
    setConsent(false);
    cleanup();
    if (onDecline) onDecline();
  };

  consentPromptActive = true;
  overlay.classList.remove('hidden');
  acceptButton.addEventListener('click', handleAccept);
  declineButton.addEventListener('click', handleDecline);

  return true;
}

export function ensureConsentDecision() {
  if (consentState.granted) {
    return Promise.resolve(true);
  }

  if (consentState.sessionDeclined) {
    return Promise.resolve(false);
  }

  if (!consentDecisionPromise) {
    consentDecisionPromise = new Promise((resolve) => {
      consentDecisionResolvers.push(resolve);
    });

    const dialogShown = showConsentDialog();
    if (!dialogShown) {
      console.warn('Telemetry consent dialog unavailable; dropping events for this session');
      consentState.sessionDeclined = true;
      resolveConsentWaiters(false);
    }
  }

  return consentDecisionPromise;
}

function readStoredConsent() {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStoredConsent(granted) {
  try {
    if (granted) {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function resolveConsentWaiters(result) {
  const resolvers = consentDecisionResolvers.splice(0, consentDecisionResolvers.length);
  consentDecisionPromise = null;

  if (resolvers.length === 0) {
    return;
  }

  resolvers.forEach((resolve) => {
    try {
      resolve(result);
    } catch (error) {
      console.warn('Failed to notify telemetry consent waiter', error);
    }
  });
}
