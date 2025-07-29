import "./global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { LaserEyesProvider, TESTNET4 } from "@omnisat/lasereyes";
import { SiwbIdentityProvider } from "ic-siwb-lasereyes-connector";
import type { _SERVICE as siwbService } from "./canister/siwb/ic_siwb_provider.d.ts";
import { idlFactory as siwbIdl } from "./canister/siwb/ic_siwb_provider.idl";

const MAX_RETRIES = 1;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      retry: MAX_RETRIES,
    },
  },
});

const container = document.querySelector("#root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <LaserEyesProvider config={{ network: TESTNET4 }}>
          <SiwbIdentityProvider<siwbService>
            canisterId={"stxih-wyaaa-aaaah-aq2la-cai"}
            idlFactory={siwbIdl}
            httpAgentOptions={{ host: "https://icp0.io" }} // use only in local canister
          >
              <App />
          </SiwbIdentityProvider>
        </LaserEyesProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}
