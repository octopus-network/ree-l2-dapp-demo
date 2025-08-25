import { UNISAT, useLaserEyes } from "@omnisat/lasereyes";
import {
  Button,
  Form,
  FormProps,
  Input,
  message,
  Skeleton,
  Steps,
  Statistic,
} from "antd";
import Search from "antd/es/input/Search";
import {
  COOKIE_CANISTER_ID,
  cookieActor,
  cookieActorWithIdentity,
  game_status_str,
} from "canister/cookie/actor";
import {
  AddLiquidityInfo,
  CookiePoolState,
  Game,
  GameAndPool,
  Gamer,
  GameStatus,
  Metadata,
} from "canister/cookie/service.did";
import { ocActor } from "canister/orchestrator/actor";
import { OrchestratorStatus } from "canister/orchestrator/service.did";
import { swapActor } from "canister/rich-swap/actor";
import { PoolBasic } from "canister/rich-swap/service.did";
import { connectWalletModalOpenAtom } from "components/ConnectDialog";
import { Register } from "components/Register";
import { sign } from "crypto";
import { useEtchingRequest, useGame } from "hooks/use-pool";
import { useWalletBtcUtxos } from "hooks/use-utxos";
import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";
import { useSetAtom } from "jotai";
import { title } from "process";
import { use, useEffect, useMemo, useState } from "react";
import { data, useParams } from "react-router-dom";
import { convertUtxo } from "utils";
import { addLiquidityTx } from "utils/tx-helper/addLiquidity";
import { withdrawTx } from "utils/tx-helper/withdraw";

const { Timer } = Statistic;

export const stateStepIndex = (game_status: GameStatus) => {
  if ("Etching" in game_status) {
    return 0;
  }
  if ("Playing" in game_status) {
    return 1;
  }
  // if ("Etching" in game_status) {
  //   return 2;
  // }
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
  const { data: game_and_pool, isLoading, isError, error } = useGame(game_id!);
  const [current, setCurrent] = useState<number>(0);

  useEffect(() => {
    if (game_and_pool) {
      setCurrent(stateStepIndex(game_and_pool.game!.game_status));
    }
  }, [game_and_pool]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading game: {error.message}</div>;
  }

  console.log({ game_and_pool });


  const steps = [
    {
      title: "Etching",
      content: <Etching game_and_pool={game_and_pool!} />,
    },
    {
      title: "Playing",
      content: <Playing 
      game={game_and_pool!.game} 
      pool_state={game_and_pool!.pool_state[0]!}
      pool_metadata={game_and_pool!.pool_metadata[0]!}
      />,
    },
    {
      title: "Wait Added Liquidity",
      content: <WaitAddedLiquidity 
      game={game_and_pool!.game} 
      pool_state={game_and_pool!.pool_state[0]!}
      pool_metadata={game_and_pool!.pool_metadata[0]!}
      />,
    },
    {
      title: "Withdrawing",
      content: (
        <Withdrawing
          game={game_and_pool!.game}
          pool_state={game_and_pool!.pool_state[0]!}
          pool_metadata={game_and_pool!.pool_metadata[0]!}
        />
      ),
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
      <div className="text-black mb-4 text-2xl font-bold text-center w-4/5">
        <div>{steps[current]!.content}</div>
      </div>
    </div>
  );
}

function Playing({ 
  game,
  pool_state,
  pool_metadata,
}: { 
  game: Game,
  pool_state: CookiePoolState,
  pool_metadata: Metadata
}) {
  // const ope
  // const [connectWalletModalOpen, setConnectWalletModalOpen] = useAtom(
  // 	connectWalletModalOpenAtom
  // )
  const setConnectWalletModalOpen = useSetAtom(connectWalletModalOpenAtom);
  const { identityAddress, identity } = useSiwbIdentity();
  const currentGamer = useMemo(() => {
    return game.gamers.find(
      (gamer) => gamer[0] === identityAddress
    )?.[1];
  }, [game.gamers, identityAddress]);
  const isGameEnd = stateStepIndex(game.game_status) > 1;

  return (
    <div>
      <h1>Playing</h1>
      <div className="flex flex-col items-center justify-center">
        <img src="/cookie.png" />
        {isGameEnd ? (
          <div>Game Is End</div>
        ) : identityAddress ? (
          !false ? (
            currentGamer ? (
              <Claim
                game={game}
                gamer={currentGamer!}
              />
            ) : (
              <Register 
              game={game} 
              pool_state={pool_state}
              pool_metadata={pool_metadata}
              />
            )
          ) : (
            <Skeleton />
          )
        ) : (
          <Button size="large" onClick={() => setConnectWalletModalOpen(true)}>
            Connect Wallet
          </Button>
        )}
      </div>
    </div>
  );
}

function EtchProcess({
  commit_txid,
  game,
}: {
  commit_txid: string | undefined;
  game: Game;
}) {
  const { identity } = useSiwbIdentity();
  const [finalizing, setFinalizing] = useState<boolean>(false);

  let status_str = game_status_str(game.game_status);

  const {
    data: etchingRequest,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useEtchingRequest(commit_txid);

  console.log({ etchingRequest });

  if (!commit_txid) {
    return <div>No Etch Process</div>;
  }

  if (isLoading) {
    return <Skeleton />;
  }

  if (isError) {
    return <div>Error loading etch process: {error.message}</div>;
  }

  if (!etchingRequest) {
    return <div>No Etching Request Found</div>;
  }

  if (!identity) {
    return <div>No Siwb Identity Found</div>;
  }

  const status = Object.keys(etchingRequest![0]!.status)[0];
  const isFinal = status === "Final";

  return (
    <div className="mt-10 text-sm font-medium text-gray-700 flex flex-col items-start">
      <h2 className="text-lg font-semibold">Etching in Progress</h2>
      <p>Rune Name: {etchingRequest![0]!.etching_args.rune_name}</p>
      <p>Premine: {etchingRequest![0]!.etching_args.premine}</p>
      <p>Commit ID: {commit_txid}</p>
      <p>Reveal ID: {etchingRequest![0]!.reveal_txid}</p>
      <p className="flex">
        Status:{" "}
        <p className={isFinal ? "text-green-500 ml-1" : "text-yellow-500 ml-1"}>
          {Object.keys(etchingRequest![0]!.status)[0]}
        </p>
      </p>
      <p>
        Create At:{" "}
        {new Date(
          Number(etchingRequest![0]!.time_at / BigInt(1000000))
        ).toLocaleString()}
      </p>

      {isFinal ? (
        <Button
          disabled={status_str !== "Etching"}
          loading={finalizing}
          className="mt-10"
          type="primary"
          onClick={() => {
            setFinalizing(true);
            cookieActorWithIdentity(identity!)
              .finalize_etch(game.game_id!)
              .then(() => {})
              .catch((e) => {
                alert("Finalize Etch Failed: " + e.message);
                console.error(e);
              })
              .finally(() => {
                window.location.reload();
              });
          }}
        >
          Finalize Etching
        </Button>
      ) : (
        <Button
          loading={isFetching}
          onClick={() => {
            refetch();
          }}
        >
          Sync
        </Button>
      )}
    </div>
  );
}

function Etching({ game_and_pool }: { game_and_pool: GameAndPool }) {
  // game.
  const [isEtching, setIsEtching] = useState<boolean>(false);
  const { identity } = useSiwbIdentity();

  let commit_txid = game_and_pool.game.etch_rune_commit_tx;

  return (
    <div className="flex flex-col items-center text-black">
      {commit_txid ? (
        <EtchProcess game={game_and_pool.game} commit_txid={commit_txid} />
      ) : (
        <div className="w-100 mt-20">
          <p>Please transfer 1 $ICP to this canister before etch: <br/><p className="text-blue-500 text-xl font-medium my-2">{COOKIE_CANISTER_ID}</p> </p>
          <Search
            placeholder="Rune Name"
            enterButton="Etch"
            loading={isEtching}
            onSearch={(value) => {
              setIsEtching(true);
              cookieActorWithIdentity(identity!)
                .etch_rune(game_and_pool.game.game_id, value)
                .then((r) => {
                  if ("Ok" in r) {
                    alert("Etch Success: " + JSON.stringify(r.Ok));
                  }
                  if ("Err" in r) {
                    throw new Error(r.Err);
                  }
                })
                .catch((e) => {
                  alert("Etch Failed: " + e.message);
                  console.error(e);
                })
                .finally(() => {
                  // setIsEtching(false);
                  window.location.reload();
                });
            }}
          />
          <p className="mt-2 text-sm text-gray-500">
            Find a usable Rune Name on
            <a
              className="text-blue-500 underline ml-1"
              href="https://testnet4.unisat.io/runes/inscribe?tab=etch"
              target="_blank"
              rel="noopener noreferrer"
            >
              Unisat
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

// function WaitAddedLiquidity({ game }: { game: Game }) {
//   return <div>

//   </div>
// }

function WaitAddedLiquidity({ 
  game,
  pool_state,
  pool_metadata 
}: { 
  game: Game,
  pool_state: CookiePoolState,
  pool_metadata: Metadata
}) {
  const setConnectWalletModalOpen = useSetAtom(connectWalletModalOpenAtom);
  const [loading, setLoading] = useState<boolean>(false);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const userBtcUtxos = useWalletBtcUtxos();
  const { paymentAddress, signPsbt } = useLaserEyes();
  const [gameSwapPool, setGameSwapPool] = useState<PoolBasic | undefined>(
    undefined
  );
  const rune_name = game.rune_info[0]!.rune_name;
  const [addLiquidityInfo, setAddLiquidityInfo] = useState<
    AddLiquidityInfo | undefined
  >(undefined);

  useEffect(() => {
    const f = async () => {
      let pool_list = await swapActor.get_pool_list();
      let pool = pool_list.find((e) => e.name === rune_name);
      let addLiquidityInfo = await cookieActor.query_add_liquidity_info(
        game.game_id
      );
      setAddLiquidityInfo(addLiquidityInfo);
      setGameSwapPool(pool);
    };

    f();
  }, []);

  // const pool = game.pool[0]!;
  // const last_pool_state = pool.states[pool.states.length - 1];
  const last_pool_state = pool_state;

  // const btc_pool = game.pool_manager.btc_pools[0]![1];
  // const rune_pool = game.pool_manager.rune_pool[0]!;
  // const last_btc_pool_state = btc_pool.states[btc_pool.states.length - 1];
  // const last_rune_pool_state = rune_pool.states[rune_pool.states.length - 1];

  const rune_coin = last_pool_state?.utxo.coins.find((c) => c.id !== "0:0")!;
  const rune_id = rune_coin.id;

  const createPool = async () => {
    let pubkey = await swapActor.create(rune_id).then((data) => {
      if ("Ok" in data) {
        window.location.reload();
      } else {
        throw new Error(data.Err ? Object.keys(data.Err)[0] : "Unknown Error");
      }
    });
    console.log({ pubkey });
  };

  const addLiquidity = async () => {
    let recommendedFeeRate = await ocActor
      .get_status()
      .then((res: OrchestratorStatus) => {
        return res.mempool_tx_fee_rate.medium;
      })
      .catch((err) => {
        console.log("get recommendedFeeRate error", err);
        throw err;
      });

    let liquidityOffer = await swapActor
      .pre_add_liquidity(gameSwapPool!.address, {
        id: rune_id,
        value: addLiquidityInfo!.rune_amount_for_add_liquidity,
      })
      .then((res) => {
        if ("Ok" in res) {
          return res.Ok;
        } else {
          throw new Error(res.Err ? Object.keys(res.Err)[0] : "Unknown Error");
        }
      });

    await addLiquidityTx({
      userBtcUtxos: userBtcUtxos!,
      btcAmountForAddLiquidity: addLiquidityInfo!.btc_amount_for_add_liquidity,
      runeid: rune_coin.id,
      gameid: Number(game.game_id),
      runeAmountForAddLiquidity:
        addLiquidityInfo!.rune_amount_for_add_liquidity,
      cookiePoolUtxo: convertUtxo(last_pool_state!.utxo, pool_metadata.key),
      paymentAddress: paymentAddress,
      swapPoolAddress: gameSwapPool!.address,
      cookiePoolAddress: pool_metadata.address,
      feeRate: Number(recommendedFeeRate.toString()),
      signPsbt: signPsbt,
      cookiePoolNonce: BigInt(pool_state.nonce),
      swapPoolNonce: liquidityOffer.nonce,
    });
  };

  return (
    <div className="flex flex-row justify-center">
      <div className="w-1/3 flex flex-col items-start">
        <h1 className="my-10">Wait Added Liquidity</h1>
        <p className="text-base">
          Game Pool BTC Balance: {last_pool_state?.utxo.sats}
        </p>
        <p className="text-base">Game Pool Rune Balance: {rune_coin?.value}</p>
        <p className="text-base">
          {rune_name} Liquidity Amount{" "}
          {addLiquidityInfo?.rune_amount_for_add_liquidity} to RichSwap{" "}
        </p>
        <p className="text-base">
          BTC Liquidity Amount {addLiquidityInfo?.btc_amount_for_add_liquidity}{" "}
          btc to RichSwap{" "}
        </p>

        {!gameSwapPool ? (
          <Button
            loading={isCalling}
            onClick={() => {
              setIsCalling(true);
              createPool().finally(() => {
                setIsCalling(false);
              });
            }}
          >
            Create Pool
          </Button>
        ) : paymentAddress ? (
          <Button
            loading={isCalling}
            onClick={() => {
              setIsCalling(true);
              addLiquidity().finally(() => {
                setIsCalling(false);
              });
            }}
          >
            Add Liquidity
          </Button>
        ) : (
          <Button onClick={() => setConnectWalletModalOpen(true)}>
            Connect Wallet
          </Button>
        )}
      </div>
    </div>
  );
}

function Withdrawing({
  game,
  pool_state,
  pool_metadata,
}: {
  game: Game;
  pool_state: CookiePoolState;
  pool_metadata: Metadata;
}) {
  const [calling, setCalling] = useState<boolean>(false);
  const { address, paymentAddress, signPsbt } = useLaserEyes();
  const setConnectWalletModalOpen = useSetAtom(connectWalletModalOpenAtom);
  const userBtcUtxos = useWalletBtcUtxos();
  // const pool = game.pool[0]!;
  // const last_pool_state = pool.states[pool.states.length - 1];
  const last_pool_state = pool_state;

  const rune_id = game.rune_info[0]!.rune_id;

  const currentGamer = useMemo(() => {
    return game.gamers.find((gamer) => gamer[0] === address)?.[1];
  }, [game.gamers, address]);

  const withdrawCookies = async () => {
    let recommendedFeeRate = await ocActor
      .get_status()
      .then((res: OrchestratorStatus) => {
        return res.mempool_tx_fee_rate.medium;
      })
      .catch((err) => {
        console.log("get recommendedFeeRate error", err);
        throw err;
      });
    return await withdrawTx({
      userBtcUtxos: userBtcUtxos!,
      runeId: rune_id,
      gameId: Number(game.game_id),
      cookiePoolBtcUtxo: convertUtxo(last_pool_state!.utxo, pool_metadata.key),
      paymentAddress: paymentAddress,
      address: address,
      cookiePoolAddress: pool_metadata.address,
      feeRate: Number(recommendedFeeRate.toString()),
      signPsbt: signPsbt,
      cookiePoolNonce: pool_state.nonce,
      withdrawAmount: BigInt(currentGamer!.cookies),
    });
  };

  return (
    <div className="mt-20">
      {currentGamer ? (
        currentGamer!.is_withdrawn ? (
          <div>
            <h1 className="text-black">Already Withdrawn</h1>
          </div>
        ) : (
          <Button
            loading={calling}
            onClick={() => {
              setCalling(true);
              withdrawCookies()
                .then((txid) => {
                  alert("Withdraw Success: " + txid);
                  window.location.reload();
                })
                .catch((err) => {
                  console.error("Withdraw Error", err);
                  alert("Withdraw Failed: " + err.message);
                })
                .finally(() => {
                  setCalling(false);
                });
            }}
          >
            Withdraw {currentGamer!.cookies} game rune token
          </Button>
        )
      ) : (
        <Button onClick={() => setConnectWalletModalOpen(true)}>
          Connect Wallet
        </Button>
      )}
    </div>
  );
}

function Claim({
  game,
  gamer,
}: // onClaim,
{
  game: Game;
  gamer: Gamer;
  // lastClaimTime: bigint;
  // claimCoolingDown: bigint;
  // claimedCookies: bigint;
  // cookieAmountPerClick: bigint;
  // onClaim: () => void;
}) {
  const { identity } = useSiwbIdentity();
  const [messageApi, contextHolder] = message.useMessage();
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const lastClaimTime = gamer.last_click_time;
  const claimCoolingDown = game.claim_cooling_down;
  const total_claimable_cookies = (Number(game.rune_premine_amount) * 4) / 5;
  const claimedCookies = gamer.cookies;
  const cookieAmountPerClick = game.claim_amount_per_click;

  const clickClaim = async () => {
    console.log("try to claim cookies");
    let res = await cookieActorWithIdentity(identity!).claim(game.game_id);
    console.log({ res });
    if ("Ok" in res) {
      messageApi.open({
        type: "success",
        content: "Claim Success",
      });

      // reload
      window.location.reload();
      // setClaimedCookies(claimedCookies + cookieAmountPerClick);
      // setLastClaimTime(BigInt(Math.floor(Date.now() / 1000)));
      // setClaimResultSuccess(true)
    } else {
      messageApi.open({
        type: "error",
        content: "Claim Failed",
      });
    }
  };

  console.log({
    lastClaimTime,
    claimCoolingDown,
    currentTime: Math.floor(Date.now() / 1000),
  });

  let nextClaimTime = lastClaimTime + claimCoolingDown;
  let nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  let isClaimable = nextClaimTime <= nowSeconds;

  console.log({
    lastClaimTime,
    claimCoolingDown,
    nextClaimTime,
    isClaimable,
    nowSeconds,
  });

  return (
    <div className="flex flex-col items-center">
      {contextHolder}
      {claimedCookies >= 0 && (
        <div className="my-2">{`Claimed Cookies: ${claimedCookies.toString()}/${total_claimable_cookies}`}</div>
      )}
      {!isClaimable ? (
        <Button disabled>
          Cooling Down
          <Timer
            valueStyle={{ color: "GrayText" }}
            type="countdown"
            value={Number(nextClaimTime) * 1000}
            onFinish={() => {
              // reload page
              // window.location.reload();
            }}
          />
        </Button>
      ) : (
        <div className="mt-4">
          <Button
            loading={isClaiming}
            onClick={() => {
              setIsClaiming(true);
              clickClaim().finally(() => {
                setIsClaiming(false);
              });
            }}
          >
            Claim {cookieAmountPerClick} Cookies
          </Button>
        </div>
      )}
    </div>
  );
}

type InitUtxo = {
  txid?: string;
  vout?: number;
  sats?: number;
  // runeId?: string;
  // runeValue?: bigint;
};
