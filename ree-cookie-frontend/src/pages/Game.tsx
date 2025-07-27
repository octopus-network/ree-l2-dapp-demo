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
import { cookieActor, cookieActorWithIdentity } from "canister/cookie/actor";
import { Game, Gamer, GameStatus } from "canister/cookie/service.did";
import { ocActor } from "canister/orchestrator/actor";
import { OrchestratorStatus } from "canister/orchestrator/service.did";
import { swapActor } from "canister/rich-swap/actor";
import { PoolBasic } from "canister/rich-swap/service.did";
import { connectWalletModalOpenAtom } from "components/ConnectDialog";
import { Register } from "components/Register";
import { useEtchingRequest, useGame } from "hooks/use-pool";
import { useWalletBtcUtxos } from "hooks/use-utxos";
import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";
import { useSetAtom } from "jotai";
import { title } from "process";
import { use, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { convertUtxo } from "utils";
import { addLiquidityTx } from "utils/tx-helper/addLiquidity";

const { Timer } = Statistic;

export const stateStepIndex = (game_status: GameStatus) => {
  if ("Initializing" in game_status) {
    return 0;
  }
  if ("Playing" in game_status) {
    return 1;
  }
  if ("Etching" in game_status) {
    return 2;
  }
  if ("WaitAddedLiquidity" in game_status) {
    return 3;
  }
  if ("Withdrawing" in game_status) {
    return 4;
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
      title: "Initializing",
      content: <InitGame game={game!} />,
    },
    {
      title: "Playing",
      content: <Playing game={game!} />,
    },
    {
      title: "Etching",
      content: <Etching game={game!} />,
    },
    {
      title: "Wait Added Liquidity",
      content: <WaitAddedLiquidity game={game!} />,
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

function Playing({ game }: { game: Game }) {
  // const ope
  // const [connectWalletModalOpen, setConnectWalletModalOpen] = useAtom(
  // 	connectWalletModalOpenAtom
  // )
  const setConnectWalletModalOpen = useSetAtom(connectWalletModalOpenAtom);
  const { identityAddress, identity } = useSiwbIdentity();
  const currentGamer = useMemo(() => {
    return game.gamers.find((gamer) => gamer[0] === identityAddress)?.[1];
  }, [game.gamers, identityAddress]);
  const isGameEnd = stateStepIndex(game.game_status) > 1;
  const { address, connect } = useLaserEyes();
  // const [isRegistered, setIsRegistered] = useState<boolean>(false);
  // const [loading, setLoading] = useState<boolean>(true);
  // const [lastClaimTime, setLastClaimTime] = useState<bigint>(BigInt(0));
  // const [claimCoolingDown, setClaimCoolingDown] = useState<bigint>(BigInt(0));
  // const [claimedCookies, setClaimedCookies] = useState<bigint>(BigInt(0));
  // const [cookieAmountPerClick, setCookieAmountPerClick] = useState<bigint>(
  // BigInt(0)
  // );
  // const [messageApi, contextHolder] = message.useMessage();

  // const isLoading = useMemo(()=> {

  // }, [])

  // return (
  //   currentGamer ?
  //   <Claim
  //   game={game}
  //   gamer={currentGamer}
  //   />
  //   :
  //   <Register game={game} />
  // )

  return (
    <div>
      <h1>Playing</h1>
      <div className="flex flex-col items-center justify-center">
        <img src="/cookie.png" />
        {isGameEnd ? (
          <div>Game Is End</div>
        ) : address ? (
          !false ? (
            currentGamer ? (
              <Claim
                game={game}
                gamer={currentGamer!}
                // lastClaimTime={lastClaimTime}
                // claimCoolingDown={claimCoolingDown}
                // claimedCookies={claimedCookies}
                // cookieAmountPerClick={cookieAmountPerClick}
                // onClaim={clickClaim}
              />
            ) : (
              <Register game={game} />
            )
          ) : (
            <Skeleton />
          )
        ) : (
          <Button size="large" onClick={() => setConnectWalletModalOpen(true)}>
            Connect Wallet
          </Button>
        )}
        {isGameEnd ? null : (
          <Button
            style={{ marginTop: "10px" }}
            size="large"
            onClick={async () => {
              cookieActorWithIdentity(identity!)
                .end_game(BigInt(game.game_id))
                .then(() => {
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

function EtchProcess({
  commit_txid,
  game_id,
}: {
  commit_txid: string | undefined;
  game_id: bigint;
}) {
  const { identity } = useSiwbIdentity();
  const [finalizing, setFinalizing] = useState<boolean>(false);

  const {
    data: etchingRequest,
    isLoading,
    isError,
    error,
  } = useEtchingRequest(commit_txid);

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
      <p>Commit ID: {commit_txid}</p>
      <p>Reveal ID: {etchingRequest![0]!.reveal_txid}</p>
      <p>Status: {Object.keys(etchingRequest![0]!.status)[0]}</p>
      <p>
        Create At:{" "}
        {new Date(
          Number(etchingRequest![0]!.time_at / BigInt(1000000))
        ).toLocaleString()}
      </p>

      {isFinal && (
        <Button
          loading={finalizing}
          className="mt-10"
          type="primary"
          onClick={() => {
            setFinalizing(true);
            cookieActorWithIdentity(identity!)
              .finalize_etch(game_id!)
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
      )}
    </div>
  );
}

function Etching({ game }: { game: Game }) {
  // game.
  const [isEtching, setIsEtching] = useState<boolean>(false);

  let commit_txid = game.etch_rune_commit_tx;

  return (
    <div className="flex flex-col items-center">
      {commit_txid ? (
        <EtchProcess game_id={game.game_id} commit_txid={commit_txid} />
      ) : (
        <div className="w-100 mt-20">
          <Search
            placeholder="Rune Name"
            enterButton="Etch"
            loading={isEtching}
            onSearch={(value) => {
              setIsEtching(true);
              cookieActor
                .etch_rune(game.game_id, value)
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

function WaitAddedLiquidity({ game }: { game: Game }) {
  const [loading, setLoading] = useState<boolean>(false);
  const userBtcUtxos = useWalletBtcUtxos();
  const { paymentAddress, signPsbt } = useLaserEyes();
  const [gameSwapPool, setGameSwapPool] = useState<PoolBasic | undefined>(
    undefined
  );
  const rune_name = game.rune_info[0]!.rune_name;

  useEffect(() => {
    const f = async () => {
      let pool_list = await swapActor.get_pool_list();
      let pool = pool_list.find((e) => e.name === rune_name);
      setGameSwapPool(pool);
    };

    f();
  }, []);

  const btc_pool = game.pool_manager.btc_pools[0]![1];
  const rune_pool = game.pool_manager.rune_pool[0]!;
  const last_btc_pool_state = btc_pool.states[btc_pool.states.length - 1];
  const last_rune_pool_state = rune_pool.states[rune_pool.states.length - 1];

  const rune_coin = last_rune_pool_state?.utxo.coins.find(
    (c) => c.id !== "0:0"
  )!;
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
    setLoading(true);
    let addLiquidityInfo = await cookieActor.query_add_liquidity_info(
      game.game_id
    );
    // let rune_id = rune_coin.id;
    // let swapPool = (await swapActor.get_pool_list()).find(e => e. == runeName)!
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
        value: addLiquidityInfo.rune_amount_for_add_liquidity,
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
      btcAmountForAddLiquidity: addLiquidityInfo.btc_amount_for_add_liquidity,
      runeid: rune_coin.id,
      gameid: Number(game.game_id),
      runeAmountForAddLiquidity: addLiquidityInfo.rune_amount_for_add_liquidity,
      cookiePoolBtcUtxo: convertUtxo(
        last_btc_pool_state!.utxo,
        btc_pool.pubkey
      ),
      cookiePoolRuneUtxo: convertUtxo(
        last_rune_pool_state!.utxo,
        rune_pool.pubkey
      ),
      paymentAddress: paymentAddress,
      swapPoolAddress: gameSwapPool!.address,
      cookieBtcPoolAddress: btc_pool.address,
      cookieRunePoolAddress: rune_pool.address,
      feeRate: Number(recommendedFeeRate.toString()),
      signPsbt: signPsbt,
      cookieBtcPoolNonce: BigInt(btc_pool.nonce),
      cookieRunePoolNonce: BigInt(rune_pool.nonce),
      swapPoolNonce: liquidityOffer.nonce,
    });
  };

  return (
    <div>
      <h1>Wait Added Liquidity</h1>
      <p>BTC Balance: {last_btc_pool_state?.utxo.sats}</p>
      <p>Rune Balance: {rune_coin?.value}</p>
      {
        loading ? (
          <Skeleton />
        ) : !gameSwapPool ? (
          <Button onClick={() => createPool()}>Create Pool</Button>
        ) : (
          <Button loading={loading} onClick={addLiquidity}>
            Add Liquidity
          </Button>
        )
        // gameSwapPool ?
      }
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

  const lastClaimTime = gamer.last_click_time;
  const claimCoolingDown = game.claim_cooling_down;
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
        <div>{`Claimed Cookies: ${claimedCookies.toString()}`}</div>
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
        <Button
          onClick={() => {
            clickClaim();
          }}
        >
          Claim {cookieAmountPerClick} Cookies
        </Button>
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

function InitGame({ game }: { game: Game }) {
  // const [messageApi, contextHolder] = message.useMessage();
  const isInitializing = stateStepIndex(game.game_status) === 0;
  const [poolAddress, setPoolAddress] = useState<string | undefined>(undefined);

  useEffect(() => {
    cookieActor.get_new_btc_pool_address(game.game_id).then((res) => {
      console.log("get_new_btc_pool_address", res);
      setPoolAddress(res);
    });
  }, []);

  const onFinish: FormProps<InitUtxo>["onFinish"] = async (values) => {
    console.log("Success Finish form:", values);
    await cookieActor
      .add_new_btc_pool(game.game_id, {
        txid: values.txid!,
        vout: Number(values.vout!),
        sats: BigInt(values.sats!),
        coins: [],
      })
      .then((res) => {
        console.log("init utxo", res);
        window.location.reload();
      });
  };

  return (
    <div className="flex flex-col items-center mt-30">
      {!isInitializing ? (
        <div>Finished Init</div>
      ) : (
        <div className="flex flex-col items-start w-2xl">
          {poolAddress ? (
            <div className="flex flex-col items-start">
              <p className="my-2 text-sm">New Pool Address: {poolAddress}</p>
              <p className="mb-5 text-sm text-amber-700">
                Please Transfer at least 546 sats to Pool Address to init pool.
              </p>
            </div>
          ) : (
            <Skeleton />
          )}
          <Form name="init-utxo" onFinish={onFinish}>
            <Form.Item<InitUtxo>
              label="txid"
              name="txid"
              rules={[{ required: true, message: "Please input txid!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item<InitUtxo>
              label="vout"
              name="vout"
              rules={[{ required: true, message: "Please input vout!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item<InitUtxo>
              label="sats"
              name="sats"
              rules={[{ required: true, message: "Please input sats!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label={null}>
              <Button type="primary" htmlType="submit">
                Init
              </Button>
            </Form.Item>
          </Form>
        </div>
      )}
    </div>
  );
}
