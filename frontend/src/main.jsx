import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './styles/index.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/responsive.css';

import { ThemeProvider } from './context/ThemeContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import { WeatherProvider } from './context/WeatherContext.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SettingsProvider>
          <LocationProvider>
            <WeatherProvider>
              <App />
            </WeatherProvider>
          </LocationProvider>
        </SettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
