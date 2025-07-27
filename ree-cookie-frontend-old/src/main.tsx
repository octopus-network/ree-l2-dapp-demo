import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LaserEyesProvider, TESTNET4, } from '@omnisat/lasereyes';
import { SiwbIdentityProvider, } from 'ic-siwb-lasereyes-connector';
import type { _SERVICE as siwbService } from './canister/siwb/ic_siwb_provider.d.ts';
import { idlFactory as siwbIdl } from './canister/siwb/ic_siwb_provider.idl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const MAX_RETRIES = 1
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Number.POSITIVE_INFINITY,
			retry: MAX_RETRIES
		}
	}
})


createRoot(document.getElementById('root')!).render(
  <div>
    <QueryClientProvider client={queryClient}>
      <LaserEyesProvider config={{ network: TESTNET4 }}>
        <SiwbIdentityProvider<siwbService>
          canisterId={'stxih-wyaaa-aaaah-aq2la-cai'}
          idlFactory={siwbIdl}
          httpAgentOptions={{ host: 'https://icp0.io' }} // use only in local canister
        >
            <App />
        </SiwbIdentityProvider>
      </LaserEyesProvider>
    </QueryClientProvider>
  </div>,
)
