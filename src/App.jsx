import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nContext';
import { SettingsProvider } from './context/SettingsContext';
import { StatsProvider } from './context/StatsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallBanner } from './components/InstallBanner';
import { Home } from './pages/Home';
import { GameSetup } from './pages/GameSetup';
import { Game } from './pages/Game';
import { Results } from './pages/Results';
import { Stats } from './pages/Stats';

function App() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <StatsProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/setup" element={<GameSetup />} />
                <Route path="/game" element={<Game />} />
                <Route path="/results" element={<Results />} />
                <Route path="/stats" element={<Stats />} />
              </Routes>
              <InstallBanner />
            </BrowserRouter>
          </ErrorBoundary>
        </StatsProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}

export default App;
