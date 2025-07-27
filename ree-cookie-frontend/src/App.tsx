import ConnectWalletModal from "components/ConnectDialog";
import { LoadingOrError } from "components/LoadingOrError";
import { CreateGameModal } from "components/modals/CreateGameModal";
import { Topbar } from "layout/Topbar";
import { Debug } from "pages/Debug";
import { GameDetail } from "pages/Game";
import { Home } from "pages/Home";
import { lazy, Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function renderError({ error }: FallbackProps) {
  return <LoadingOrError error={error} />;
}

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary fallbackRender={renderError}>
        <Suspense fallback={<LoadingOrError />}>
          <Topbar />
          <Routes>
            <Route element={<Home />} index={true} />
            <Route element={<GameDetail />} path="/game/:game_id" />
            <Route path='/debug/:address' element={<Debug />} />
          </Routes>
          <CreateGameModal />
          <ConnectWalletModal />
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
