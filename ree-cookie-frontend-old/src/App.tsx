import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Hom";
import { Topbar } from "./layout/Topbar";
import { ConnectWalletModal } from "./components/modals/ConnetWalletModal";

function App() {
  return (
      <BrowserRouter>
        <Topbar />
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Add other routes here */}
          {/* <Route path="/game/:id" element={<Game />} /> */}
        </Routes>
        <ConnectWalletModal />
      </BrowserRouter>
  );
}

// function App() {

//   // const [loginAddress, setLoginAddress] = useState<string | undefined>(undefined);

//   const { address, isInitializing, paymentAddress, connect, disconnect,signMessage } = useLaserEyes();
//   const { identity, identityAddress, clear } = useSiwbIdentity();
//   // const [psbt, setPsbt] = useState<bitcoin.Psbt>();
//   // console.log(JSON.stringify(btcUtxos))
//   const [gameStatus, setGameStatus] = useState<GameStatus | undefined>(undefined);
//   const [exchangeState, setExchangeState] = useState<ExchangeState | undefined>(undefined);

//   console.log({address, paymentAddress})

//   useEffect(() => {
//     cookieActor.get_exchange_state().then((e) => {
//       setExchangeState(e)
//       setGameStatus(e.game_status)
//       console.log("fetch exchagne state", e)
//     } )
//   },[])

//   return (
//     <div className="App">
//       <Topbar />

//       {/* <Game /> */}

//       {/* {
//         !gameStatus?
//         <Skeleton /> :
//         <GameSteps gameStatus={gameStatus!} exchangeState={exchangeState} />
//       } */}
//     </div>
//   );
// }

export default App;
