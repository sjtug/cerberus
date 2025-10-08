// Telemetry module for handling error reporting with user consent

let sentryInit = null;
let sentryCaptureException = null;
let sentryCaptureMessage = null;
let sentryCaptureEvent = null;
let sentryWithScope = null;

let sentryInitialized = false;
let consentPromptActive = false;
const pendingEvents = [];

// Persisted consent helpers
function readStoredConsent() {
  try {
    return localStorage.getItem('cerberus_telemetry_consent') === 'true';
  } catch {
    return false;
  }
}

function writeStoredConsent(granted) {
  try {
    if (granted) {
      localStorage.setItem('cerberus_telemetry_consent', 'true');
    } else {
      localStorage.removeItem('cerberus_telemetry_consent');
    }
  } catch {
    // Ignore storage errors
  }
}

const consentState = {
  granted: readStoredConsent(),
  sessionDeclined: false,
};

export function hasConsent() {
  return consentState.granted;
}

export function setConsent(granted) {
  consentState.granted = granted;
  consentState.sessionDeclined = !granted;
  consentPromptActive = false;
  writeStoredConsent(granted);

  if (!granted) {
    pendingEvents.length = 0;
    return;
  }

  if (sentryInitialized && pendingEvents.length > 0) {
    flushPendingEvents();
  }
}

// Initialize Sentry if configuration is provided
export async function initTelemetry(config) {
  if (!config || !config.telemetryDSN) {
    return false;
  }

  if (sentryInitialized) {
    return true;
  }

  try {
    // Dynamically import only the functions we need for tree-shaking
    const sentryModule = await import('./telemetry.sentry.mjs');

    sentryInit = sentryModule.init;
    sentryCaptureException = sentryModule.captureException;
    sentryCaptureMessage = sentryModule.captureMessage;
    sentryCaptureEvent = sentryModule.captureEvent;
    sentryWithScope = sentryModule.withScope;

    sentryInit({
      dsn: config.telemetryDSN,
      debug: config.telemetryEnv === 'development' ? true : false,
      environment: config.telemetryEnv || 'production',
      sampleRate: typeof config.telemetryRate === 'number' ? config.telemetryRate : 1,
      integrations: sentryModule.integrations,
      tracesSampleRate: 0,  // Disable tracing
      beforeSend: (event, hint) => {
        sanitizeEvent(event);
        if (!consentState.granted) {
          pendingEvents.push({ event, hint });
          showConsentDialog();
          return null;
        }
        return event;
      },
      initialScope: {
        tags: {
          request_id: config.requestID,
        },
        contexts: {
          cerberus: {
            request_id: config.requestID,
          }
        }
      }
    });

    sentryInitialized = true;
    if (consentState.granted && pendingEvents.length > 0) {
      flushPendingEvents();
    }
    return true;
  } catch (error) {
    console.warn('Failed to initialize telemetry:', error);
    return false;
  }
}

// Capture an error with context
export function captureError(error, context = {}) {
  if (!sentryInitialized || !sentryCaptureException || !sentryWithScope) {
    return;
  }
  withTelemetryScope(null, context, () => {
    console.log("Capturing error", error);
    sentryCaptureException(error);
  });
}

// Capture a message with context
export function captureTelemetryMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized || !sentryCaptureMessage || !sentryWithScope) {
    return;
  }
  withTelemetryScope(level, context, () => {
    sentryCaptureMessage(message);
  });
}

// Show consent dialog
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

function flushPendingEvents() {
  if (!sentryInitialized || !sentryCaptureEvent) {
    return;
  }

  pendingEvents.forEach(({ event, hint }) => {
    sentryCaptureEvent(event, hint);
  });
  pendingEvents.length = 0;
}

function sanitizeEvent(event) {
  if (!event) {
    return;
  }

  if (event.user) {
    delete event.user.ip_address;
    delete event.user.email;
    delete event.user.username;
  }
}

function withTelemetryScope(level, context, callback) {
  sentryWithScope((scope) => {
    if (typeof level === 'string' && level) {
      scope.setLevel(level);
    }

    Object.entries(context || {}).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    scope.setContext('browser', getBrowserContext());

    callback(scope);
  });
}

const browserContext = {
  webassembly_supported: typeof WebAssembly !== 'undefined',
  web_worker_supported: typeof Worker !== 'undefined',
  user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
};

function getBrowserContext() {
  return browserContext;
}

function stripSentryCaptured(hint) {
  if (!hint || (typeof hint !== 'object' && typeof hint !== 'function') || !hint.originalException) {
    return hint;
  }

  if (Object.prototype.hasOwnProperty.call(hint.originalException, '__sentry_captured__')) {
    console.log("Stripping __sentry_captured__", hint.originalException);
    delete hint.originalException.__sentry_captured__;
  }
  return hint;
}
