import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { ExchangeState, GameStatus } from './canister/cookie/service.did';
import { SiwbIdentityProvider, useSiwbIdentity } from 'ic-siwb-lasereyes-connector';
import { LaserEyesProvider, TESTNET4, useLaserEyes } from '@omnisat/lasereyes';
import { cookieActor } from './canister/cookie/actor';
import { Skeleton } from "antd";
import { Topbar } from './components/topbar';
import { GameSteps } from './components/GameSteps';

function App() {

  // const [loginAddress, setLoginAddress] = useState<string | undefined>(undefined);

  const { address, isInitializing, paymentAddress, connect, disconnect,signMessage } = useLaserEyes();
  const { identity, identityAddress, clear } = useSiwbIdentity();
  // const [psbt, setPsbt] = useState<bitcoin.Psbt>();
  // console.log(JSON.stringify(btcUtxos))
  const [gameStatus, setGameStatus] = useState<GameStatus | undefined>(undefined);
  const [exchangeState, setExchangeState] = useState<ExchangeState | undefined>(undefined);

  console.log({address, paymentAddress})

  useEffect(() => {
    cookieActor.get_exchange_state().then((e) => {
      setExchangeState(e)
      setGameStatus(e.game_status)
      console.log("fetch exchagne state", e)
    } )
  },[])

  return (
    <div className="App">
      <Topbar />


      {/* <Game /> */}

      {
        !gameStatus?
        <Skeleton /> :
        <GameSteps gameStatus={gameStatus!} exchangeState={exchangeState} />
      }
    </div>
  );
}

export default App
