import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { HashRouter } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';
import { UserContextProvider } from './state/UserContext.tsx';

// import 'primereact/resources/themes/lara-dark-amber/theme.css';
import 'primereact/resources/themes/mdc-dark-indigo/theme.css';
import 'primeflex/primeflex.min.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import '../index.css';

const value = {
  hideOverlaysOnDocumentScrolling: true,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <PrimeReactProvider value={value}>
        <UserContextProvider>
          <App />
        </UserContextProvider>
      </PrimeReactProvider>
    </HashRouter>
  </StrictMode>,
);
