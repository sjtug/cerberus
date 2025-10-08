// Telemetry module for handling error reporting with user consent

import { ensureConsentDecision } from './telemetry.consent.mjs';
export { hasConsent, setConsent, showConsentDialog } from './telemetry.consent.mjs';

let sentryInit = null;
let sentryCaptureException = null;
let sentryCaptureMessage = null;
let sentryWithScope = null;

let sentryInitialized = false;

const browserContext = {
  webassembly_supported: typeof WebAssembly !== 'undefined',
  web_worker_supported: typeof Worker !== 'undefined',
  user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
};

export async function initTelemetry(config) {
  if (!config || !config.telemetryFrontendDSN) {
    return false;
  }

  if (sentryInitialized) {
    return true;
  }

  try {
    const sentryModule = await import('./telemetry.sentry.mjs');

    sentryInit = sentryModule.init;
    sentryCaptureException = sentryModule.captureException;
    sentryCaptureMessage = sentryModule.captureMessage;
    sentryWithScope = sentryModule.withScope;

    const consentIntegration = sentryModule.createConsentIntegration({
      ensureConsent: ensureConsentDecision,
    });

    sentryInit({
      dsn: config.telemetryFrontendDSN,
      debug: config.telemetryEnv === 'development',
      environment: config.telemetryEnv || 'production',
      sampleRate: typeof config.telemetryRate === 'number' ? config.telemetryRate : 1,
      integrations: [consentIntegration],
      tracesSampleRate: 0,
      beforeSend: (event) => {
        sanitizeEvent(event);
        return event;
      },
      initialScope: {
        tags: {
          request_id: config.requestID,
        },
        contexts: {
          cerberus: {
            request_id: config.requestID,
          },
        },
      },
    });

    sentryInitialized = true;
    return true;
  } catch (error) {
    console.warn('Failed to initialize telemetry:', error);
    return false;
  }
}

export function captureError(error, context = {}) {
  if (!sentryInitialized || !sentryCaptureException || !sentryWithScope) {
    return;
  }

  withTelemetryScope(null, context, () => {
    sentryCaptureException(error);
  });
}

export function captureTelemetryMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized || !sentryCaptureMessage || !sentryWithScope) {
    return;
  }

  withTelemetryScope(level, context, () => {
    sentryCaptureMessage(message);
  });
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

function sanitizeEvent(event) {
  if (!event || !event.user) {
    return;
  }

  delete event.user.ip_address;
  delete event.user.email;
  delete event.user.username;
}

function getBrowserContext() {
  return browserContext;
}
