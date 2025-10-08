import { globalHandlersIntegration } from '@sentry/browser';

export {
  init,
  captureException,
  captureMessage,
  captureEvent,
  withScope,
} from '@sentry/browser';

export const integrations = (is) =>
  is
    .filter((i) => i.name !== "Dedupe" && i.name !== "GlobalHandlers")
    .map((i) => {
      console.log("Integration", i.name);
      return i;
    });
    // .concat([
    //   globalHandlersIntegration({
    //     onerror: false,
    //     onunhandledrejection: true,
    //   }),
    // ]);