import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LaserEyesProvider, TESTNET4, useLaserEyes } from '@omnisat/lasereyes';
import { SiwbIdentityProvider, useSiwbIdentity } from 'ic-siwb-lasereyes-connector';
import type { _SERVICE as siwbService } from './canister/siwb/ic_siwb_provider.d.ts';
import { idlFactory as siwbIdl } from './canister/siwb/ic_siwb_provider.idl';

createRoot(document.getElementById('root')!).render(
  <div>
      <LaserEyesProvider config={{ network: TESTNET4 }}>
        <SiwbIdentityProvider<siwbService>
          canisterId={'stxih-wyaaa-aaaah-aq2la-cai'}
          idlFactory={siwbIdl}
          httpAgentOptions={{ host: 'https://icp0.io' }} // use only in local canister
        >
            <App />
        </SiwbIdentityProvider>

      </LaserEyesProvider>
  </div>,
)
