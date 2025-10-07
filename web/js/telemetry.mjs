// Telemetry module for handling error reporting with user consent

let sentryInit = null;
let sentryCaptureException = null;
let sentryCaptureMessage = null;
let sentryWithScope = null;
let sentryBrowserTracingIntegration = null;

let sentryInitialized = false;
let consentGiven = false;
const pendingEvents = [];

// Check if user has previously given consent
export function hasConsent() {
  try {
    return localStorage.getItem('cerberus_telemetry_consent') === 'true';
  } catch (e) {
    // localStorage might not be available
    return false;
  }
}

// Store user consent decision
export function setConsent(granted) {
  try {
    if (granted) {
      localStorage.setItem('cerberus_telemetry_consent', 'true');
    } else {
      localStorage.removeItem('cerberus_telemetry_consent');
    }
  } catch (e) {
    // localStorage might not be available
  }
  consentGiven = granted;

  // If consent was granted and we have pending events, send them
  if (granted && sentryInitialized && pendingEvents.length > 0) {
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
    sentryWithScope = sentryModule.withScope;
    sentryBrowserTracingIntegration = sentryModule.browserTracingIntegration;

    sentryInit({
      dsn: config.telemetryDSN,
      environment: config.telemetryEnv || 'production',
      sampleRate: typeof config.telemetryRate === 'number' ? config.telemetryRate : 1,
      integrations: [
        sentryBrowserTracingIntegration(),
      ],
      tracesSampleRate: 0,  // Disable tracing to reduce bundle size
      beforeSend: (event) => {
        // Only send events if consent has been given
        if (!consentGiven && !hasConsent()) {
          // Store the error for later if user gives consent
          pendingEvents.push({ type: 'error', error: event });
          return null;
        }
        // Remove any PII
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
          delete event.user.username;
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
    consentGiven = hasConsent();
    if (consentGiven && pendingEvents.length > 0) {
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

  if (!consentGiven && !hasConsent()) {
    pendingEvents.push({ type: 'error', error, context });
    return;
  }

  sentryWithScope((scope) => {
    // Add context
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    // Capture browser capabilities
    scope.setContext('browser', {
      webassembly_supported: typeof WebAssembly !== 'undefined',
      web_worker_supported: typeof Worker !== 'undefined',
      user_agent: navigator.userAgent,
      language: navigator.language,
    });

    sentryCaptureException(error);
  });
}

// Capture a message with context
export function captureTelemetryMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized || !sentryCaptureMessage || !sentryWithScope) {
    return;
  }

  if (!consentGiven && !hasConsent()) {
    pendingEvents.push({ type: 'message', message, level, context });
    return;
  }

  sentryWithScope((scope) => {
    // Set level
    scope.setLevel(level);

    // Add context
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    // Capture browser capabilities
    scope.setContext('browser', {
      webassembly_supported: typeof WebAssembly !== 'undefined',
      web_worker_supported: typeof Worker !== 'undefined',
      user_agent: navigator.userAgent,
      language: navigator.language,
    });

    sentryCaptureMessage(message);
  });
}

// Show consent dialog
export function showConsentDialog(onAccept, onDecline) {
  // Get the dialog overlay from the DOM
  const overlay = document.getElementById('telemetry-consent-overlay');
  if (!overlay) {
    console.warn('Telemetry consent dialog not found in DOM');
    return;
  }

  // Show the dialog
  overlay.classList.remove('hidden');

  // Get buttons
  const acceptButton = document.getElementById('telemetry-accept');
  const declineButton = document.getElementById('telemetry-decline');

  // Handle accept
  const handleAccept = () => {
    setConsent(true);
    overlay.classList.add('hidden');
    acceptButton.removeEventListener('click', handleAccept);
    declineButton.removeEventListener('click', handleDecline);
    if (onAccept) onAccept();
  };

  // Handle decline
  const handleDecline = () => {
    setConsent(false);
    overlay.classList.add('hidden');
    acceptButton.removeEventListener('click', handleAccept);
    declineButton.removeEventListener('click', handleDecline);
    if (onDecline) onDecline();
  };

  acceptButton.addEventListener('click', handleAccept);
  declineButton.addEventListener('click', handleDecline);
}

function flushPendingEvents() {
  if (!sentryInitialized) {
    return;
  }

  pendingEvents.forEach((event) => {
    if (event.type === 'error') {
      sentryCaptureException?.(event.error);
    } else if (event.type === 'message') {
      sentryCaptureMessage?.(event.message);
    }
  });
  pendingEvents.length = 0;
}
