import * as Sentry from '@sentry/react';

/**
 * Optional telemetry, entirely env-gated. With neither env var set this is a
 * no-op and the app ships zero third-party tracking/error-reporting code
 * paths at runtime.
 *
 * - `VITE_PLAUSIBLE_DOMAIN`: injects the Plausible analytics script
 *   (privacy-friendly, no cookies) for the given domain.
 * - `VITE_SENTRY_DSN`: initializes Sentry error reporting.
 */
export function initTelemetry(): void {
  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as
    | string
    | undefined;
  if (plausibleDomain && typeof document !== 'undefined') {
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = plausibleDomain;
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 0.1,
    });
  }
}
