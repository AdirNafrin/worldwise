import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
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

// Shared shell rendered above every page: the matched route's page via
// <Outlet/>, plus the install banner that should float over any screen.
function RootLayout() {
  return (
    <>
      <Outlet />
      <InstallBanner />
    </>
  );
}

// A data router (rather than plain <BrowserRouter>/<Routes>) is required
// for useBlocker, which Game.jsx uses to intercept the browser/OS back
// gesture mid-round and ask for confirmation instead of silently losing
// progress.
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/setup', element: <GameSetup /> },
      { path: '/game', element: <Game /> },
      { path: '/results', element: <Results /> },
      { path: '/stats', element: <Stats /> },
    ],
  },
]);

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
            <RouterProvider router={router} />
          </ErrorBoundary>
        </StatsProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}

export default App;
