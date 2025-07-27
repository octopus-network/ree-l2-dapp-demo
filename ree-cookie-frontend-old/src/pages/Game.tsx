import { UNISAT, useLaserEyes } from "@omnisat/lasereyes";
import { Button, message, Skeleton, Steps } from "antd";
import { cookieActor, cookieActorWithIdentity } from "../canister/cookie/actor";
import { Game, GameStatus } from "../canister/cookie/service.did";
import { Register } from "../components/Register";
import { useGame } from "../hooks/use-pool";
import { useWalletBtcUtxos } from "../hooks/use-utxos";
import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

export const stateStepIndex = (game_status: GameStatus) => {
  if ("Playing" in game_status) {
    return 0;
  }
  if ("Etching" in game_status) {
    return 1;
  }
  if ("WaitAddedLiquidity" in game_status) {
    return 2;
  }
  if ("Withdrawing" in game_status) {
    return 3;
  }

  throw new Error("Invalid game status");
};

export function GameDetail() {
  const { game_id } = useParams<{ game_id: string }>();
  const { data: game, isLoading, isError, error } = useGame(game_id!);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (game) {
      setCurrent(stateStepIndex(game!.game_status));
    }
  }, [game]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading game: {error.message}</div>;
  }

  const steps = [
    {
      title: "Playing",
      content: <Playing game={game!} gameStatus={game!.game_status} />,
    },
    {
      title: "Etching",
      content: <Etching />,
    },
    {
      title: "Wait Added Liquidity",
      content: <WaitAddedLiquidity />,
    },
    {
      title: "Withdrawing",
      content: <Withdrawing />,
    },
  ];
  const items = steps.map((item) => ({ key: item.title, title: item.title }));
  const onChange = (value: number) => {
    setCurrent(value);
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 bg-[#f0f2f5]">
      <div className="w-4/5 mb-4 mt-15">
        <Steps current={current} items={items} onChange={onChange} />
      </div>
      <div className="mb-4 text-2xl font-bold text-center w-4/5">
        <div>{steps[current]!.content}</div>
      </div>
    </div>
  );
}

function Playing({ game, gameStatus }: { game: Game; gameStatus: GameStatus }) {
  const isGameEnd = stateStepIndex(gameStatus) > 0;
  const { address, paymentAddress, connect, isConnecting, isInitializing } = useLaserEyes();
  const [lastClaimTime, setLastClaimTime] = useState<bigint>(BigInt(0));
  // const [claimedCookies, setClaimedCookies] = useState<bigint>(BigInt(0));
  // const [cookieAmountPerClick, setCookieAmountPerClick] = useState<bigint>(
  //   BigInt(0)
  // );
  const [messageApi, contextHolder] = message.useMessage();
  const btcUtxos = useWalletBtcUtxos();
  const { identity } = useSiwbIdentity();

  const isRegistered = useMemo(() => {
    return game.gamers.some(
      ([gamerId]) => gamerId === address || gamerId === paymentAddress
    );
  }, [game.gamers, address, paymentAddress]);

  const isLoading = useMemo(() => {
    return isConnecting || isInitializing;
  }, [isConnecting, isInitializing]);

  const clickClaim = async () => {
    console.log("try to claim cookies");
    const res = await cookieActorWithIdentity(identity!).claim(game.game_id);
    console.log({ res });
    if ("Ok" in res) {
      messageApi.open({
        type: "success",
        content: "Claim Success",
      });
      setClaimedCookies(claimedCookies + cookieAmountPerClick);
      setLastClaimTime(BigInt(Math.floor(Date.now() / 1000)));
      // setClaimResultSuccess(true)
    } else {
      messageApi.open({
        type: "error",
        content: "Claim Failed",
      });
    }
  };

  return (
    <div>
      {contextHolder}
      <h1>Playing</h1>
      <div className="flex flex-col items-center justify-center">
        <img src="/cookie.png" />
        {isGameEnd ? (
          <div>Game Is End</div>
        ) : paymentAddress ? (
          !loading ? (
            isRegistered ? (
              <Claim
                lastClaimTime={lastClaimTime}
                claimCoolingDown={claimCoolingDown}
                claimedCookies={claimedCookies}
                cookieAmountPerClick={cookieAmountPerClick}
                onClaim={clickClaim}
              />
            ) : (
              <Register
                game={game}
                paymentAddress={paymentAddress}
                paymentAddressUtxos={btcUtxos}
              />
            )
          ) : (
            <Skeleton />
          )
        ) : (
          <Button size="large" onClick={() => connect(UNISAT)}>
            Connect Wallet
          </Button>
        )}
        {isGameEnd ? null : (
          <Button
            style={{ marginTop: "10px" }}
            size="large"
            onClick={async () => {
              cookieActor.end_game(BigInt(game.game_id)).then(() => {
                window.location.reload();
              });
            }}
          >
            End Game
          </Button>
        )}
      </div>
    </div>
  );
}

function Etching() {
  return (
    <div>
      <h1>Etching</h1>
    </div>
  );
}

function WaitAddedLiquidity() {
  return (
    <div>
      <h1>Wait Added Liquidity</h1>
    </div>
  );
}

function Withdrawing() {
  return (
    <div>
      <h1>Withdrawing</h1>
    </div>
  );
}

function Claim({
  lastClaimTime,
  claimCoolingDown,
  claimedCookies,
  cookieAmountPerClick,
  onClaim,
}: {
  lastClaimTime: bigint;
  claimCoolingDown: bigint;
  claimedCookies: bigint;
  cookieAmountPerClick: bigint;
  onClaim: () => void;
}) {
  console.log({
    lastClaimTime,
    claimCoolingDown,
    currentTime: Math.floor(Date.now() / 1000),
  });

  return (
    <div className="flex flex-col items-center">
      {claimedCookies >= 0 && (
        <div>{`Claimed Cookies: ${claimedCookies.toString()}`}</div>
      )}
      {lastClaimTime + claimCoolingDown >
      BigInt(Math.floor(Date.now() / 1000)) ? (
        <Button disabled>Cooling Down</Button>
      ) : (
        <Button
          onClick={() => {
            onClaim();
          }}
        >
          Claim {cookieAmountPerClick} Cookies
        </Button>
      )}
    </div>
  );
}
