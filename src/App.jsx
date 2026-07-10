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

// Root component: wires up the app-wide providers (language, theme/sound
// settings, saved stats) and the page router. Provider order matters here
// only in that ErrorBoundary must sit inside the providers it needs to
// render its fallback UI (I18n) but outside the router so a crash on any
// page still shows the fallback instead of a blank screen.
function App() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <StatsProvider>
          <ErrorBoundary>
            <BrowserRouter>
              {/* Each route is one full-screen "page" from the spec (home,
                  setup, the game itself, results, stats). */}
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/setup" element={<GameSetup />} />
                <Route path="/game" element={<Game />} />
                <Route path="/results" element={<Results />} />
                <Route path="/stats" element={<Stats />} />
              </Routes>
              {/* Floating install prompt; renders itself only once a round
                  has been completed and the browser has offered to install. */}
              <InstallBanner />
            </BrowserRouter>
          </ErrorBoundary>
        </StatsProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}

export default App;
