import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App';
import './index.css';

const convexUrl = import.meta.env.VITE_CONVEX_URL;

function Root() {
  if (convexUrl) {
    const convex = new ConvexReactClient(convexUrl);
    return (
      <StrictMode>
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      </StrictMode>
    );
  }

  // Modalità offline — senza Convex
  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
