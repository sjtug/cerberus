export {
  init,
  captureException,
  captureMessage,
  captureEvent,
  withScope,
} from '@sentry/browser';

export function createConsentIntegration({ ensureConsent }) {
  return {
    name: 'CerberusConsentGate',
    setupOnce() {
      // No setup required; gating lives in processEvent.
    },
    async processEvent(event) {
      try {
        const allowed = await ensureConsent();
        return allowed ? event : null;
      } catch (error) {
        console.warn('Telemetry consent integration failed, dropping event', error);
        return null;
      }
    },
  };
}
