// Telemetry module for handling error reporting with user consent

let sentryInitialized = false;
let sentryModule = null;
let consentGiven = false;
let pendingErrors = [];

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

  // If consent was granted and we have pending errors, send them
  if (granted && sentryInitialized && pendingErrors.length > 0) {
    pendingErrors.forEach(error => {
      if (error.type === 'error') {
        sentryModule.captureException(error.error);
      } else {
        sentryModule.captureMessage(error.message, error.level);
      }
    });
    pendingErrors = [];
  }
}

// Initialize Sentry if configuration is provided
export async function initTelemetry(config) {
  if (!config || !config.telemetryDSN) {
    return false;
  }

  try {
    // Dynamically import Sentry to avoid bundling it if not needed
    sentryModule = await import('https://browser.sentry-cdn.com/8.47.0/bundle.min.js');

    sentryModule.init({
      dsn: config.telemetryDSN,
      environment: config.telemetryEnv || 'production',
      sampleRate: 1.0, // Always capture all events (100%)
      integrations: [
        sentryModule.browserTracingIntegration(),
      ],
      tracesSampleRate: 1.0, // Always capture all traces (100%)
      beforeSend: (event) => {
        // Only send events if consent has been given
        if (!consentGiven && !hasConsent()) {
          // Store the error for later if user gives consent
          pendingErrors.push({ type: 'error', error: event });
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
    return true;
  } catch (error) {
    console.warn('Failed to initialize telemetry:', error);
    return false;
  }
}

// Capture an error with context
export function captureError(error, context = {}) {
  if (!sentryInitialized || !sentryModule) {
    return;
  }

  if (!consentGiven && !hasConsent()) {
    pendingErrors.push({ type: 'error', error, context });
    return;
  }

  sentryModule.withScope((scope) => {
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

    sentryModule.captureException(error);
  });
}

// Capture a message with context
export function captureMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized || !sentryModule) {
    return;
  }

  if (!consentGiven && !hasConsent()) {
    pendingErrors.push({ type: 'message', message, level, context });
    return;
  }

  sentryModule.withScope((scope) => {
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

    sentryModule.captureMessage(message, level);
  });
}

// Show consent dialog
export function showConsentDialog(onAccept, onDecline) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    margin: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;

  dialog.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 20px; font-weight: bold;">Help Improve Cerberus</h3>
    <p style="margin: 0 0 16px 0; color: #666;">
      The challenge validation failed. Would you like to send an anonymous error report to help us improve compatibility?
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #888;">
      The report will only include:
      <ul style="margin: 8px 0 0 20px; font-size: 14px; color: #888;">
        <li>Browser capabilities (WebAssembly support, etc.)</li>
        <li>Error type and challenge parameters</li>
        <li>No personal information or IP addresses</li>
      </ul>
    </p>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="decline-telemetry" style="
        padding: 8px 16px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
      ">Don't Send</button>
      <button id="accept-telemetry" style="
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        background: #b79ecf;
        color: white;
        cursor: pointer;
        font-size: 14px;
      ">Send Report</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Handle accept
  document.getElementById('accept-telemetry').onclick = () => {
    setConsent(true);
    document.body.removeChild(overlay);
    if (onAccept) onAccept();
  };

  // Handle decline
  document.getElementById('decline-telemetry').onclick = () => {
    setConsent(false);
    document.body.removeChild(overlay);
    if (onDecline) onDecline();
  };
}
