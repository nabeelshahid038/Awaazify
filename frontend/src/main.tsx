import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initTelemetry } from './lib/telemetry';

// Optional, env-gated: Plausible analytics + Sentry error reporting.
// No-op unless VITE_PLAUSIBLE_DOMAIN / VITE_SENTRY_DSN are set.
initTelemetry();

createRoot(document.getElementById('root')!).render(<App />);
