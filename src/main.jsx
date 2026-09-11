import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Registra il Service Worker (PWA standalone iOS/Android/Desktop)
registerSW({ immediate: true });

const convexUrl = import.meta.env.VITE_CONVEX_URL;
// Un solo client per tutta la vita dell'app (prima veniva ricreato a ogni render di Root)
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function Root() {
  if (convex) {
    return (
      <StrictMode>
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      </StrictMode>
    );
  }

  // Modalità demo/offline — senza Convex (dati in localStorage)
  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
