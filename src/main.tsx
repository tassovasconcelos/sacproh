import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './services/operationalHotfix';
import {initializeMarketingAnalytics} from './services/marketingAnalytics';
import {initializeSecureAuth} from './services/secureAuth';

const bootstrap = async () => {
  await initializeSecureAuth();
  initializeMarketingAnalytics();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void bootstrap();
