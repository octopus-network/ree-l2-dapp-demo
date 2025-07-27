import { ExchangeState, GameStatus, Gamer, RegisterInfo } from "../canister/cookie/service.did";
import { useEffect, useState } from "react";
import { Button, Skeleton, message } from 'antd';
import { Steps } from 'antd';
import { cookieActor, cookieActorWithIdentity } from "../canister/cookie/actor";
import InitBtcUtxoDialog from "./InitUtxoDialog";
import { UNISAT, useLaserEyes } from "@omnisat/lasereyes";
import { COOKIE_EXCHANGE_ID } from "../constants";
import { convertUtxo, getP2trAressAndScript, registerTx } from "../utils";
import { AddressType, UnspentOutput } from "../types";
import { useWalletBtcUtxos } from "../hooks/use-utxos";
import { ocActor } from "../canister/orchestrator/actor";
import { OrchestratorStatus } from "../canister/orchestrator/service.did";
import InitUtxoDialog from "./InitUtxoDialog";
import { Register } from "./Register";
import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";
import { AddLiquidity } from "./AddLiquidity";
import { withdrawTx } from "../utils/tx-helper/withdraw";

export const stateStepIndex = (gameStatus: GameStatus) => {
    // UnInit,
    // InitKey,
    // InitUtxo,
    // Play,
    // Ended,
    // LiquidityAdded,
    // InitKey,
    // InitUtxo,
    // Play,
    // AddLiquidity,
    // Withdrawable

    if ('InitKey' in gameStatus) {
        return 0
    }
    if ('InitUtxo' in gameStatus) {
        return 1
    }
    if ('Play' in gameStatus) {
        return 2
    }
    if ('AddLiquidity' in gameStatus) {
        return 3
    }
    if ('Withdrawable' in gameStatus) {
        return 4
    }
    throw new Error("Invalid game status");
}

export function GameSteps(
    {
        gameStatus,
        exchangeState
    }:
        {
            gameStatus: GameStatus,
            exchangeState: ExchangeState
        },
) {
    // const [clickableStep, setClickableStep] = useState(0);
    const [current, setCurrent] = useState(stateStepIndex(gameStatus));

    const steps = [
        {
            title: 'Init Key',
            content: <InitPoolKey exchangeState={exchangeState} />,
        },
        {
            title: 'Init Utxo',
            content: <InitUtxo exchangeState={exchangeState} />,
        },
        {
            title: 'Play Game',
            content: <PlayGame gameStatus={gameStatus} setStep={setCurrent} />,
        },
        {
            title: 'Add Liquidity',
            content: <AddLiquidity gameStatus={gameStatus} />,
        },
        {
            title: 'Withdraw',
            content: <Withdraw gameStatus={gameStatus} />,
        },
    ]
    const items = steps.map((item) => ({ key: item.title, title: item.title }));
    const onChange = (value: number) => {
        // if (value > stateStepIndex(gameStatus)) {
        //     return;
        // }
        setCurrent(value);
    };

    return (
        <div>
            <Steps current={current} items={items} onChange={onChange} />
            <div>{steps[current].content}</div>
        </div>
    );
}

function InitPoolKey({
    exchangeState
}: {
    exchangeState: ExchangeState | undefined
}) {

    // const {}
    // const [poolAddress, setPoolAddress] = useState<string | undefined>(
    //     exchangeState.address.length > 0 ? exchangeState.address[0] : undefined
    // )

    if (!exchangeState) {
        return <Skeleton />
    }

    return <div>
        {
            exchangeState.address.length > 0
                ?
                <div>
                    <p>
                        Already Init Pool Key
                    </p>
                    <br />
                    <p>
                        Pool Address: {exchangeState.address[0]}
                    </p>
                </div>
                :
                <div>
                    <Button onClick={async () => {
                        let r = await cookieActor.init_key()
                        console.log(r)
                        window.location.reload()
                    }}>
                        Init Pool Key
                    </Button>
                </div>
        }
    </div>
}

function InitUtxo({
    exchangeState
}: {
    exchangeState: ExchangeState
}) {
    // let lastState = exchangeState.states.slice(-1)[0] 
    const [initDialogOpen, setInitDialogOpen] = useState(false);

    return <div>
        {
            exchangeState.states.length === 0 ?
                <div>
                    <Button onClick={() => {
                        setInitDialogOpen(true)
                    }}>
                        Init Utxo
                    </Button>
                </div>
                :
                <div>
                    Already Init Utxo.
                </div>
        }
        <InitUtxoDialog isOpen={initDialogOpen} setIsOpen={(isOpen) => setInitDialogOpen(isOpen)} />
    </div>

}

// function InitGame(
//     {
//         gameStatus,
//         setStep,
//         exchangeState
//     }: {
//         gameStatus: GameStatus,
//         exchangeState: ExchangeState
//         setStep: (step: number) => void
//     }
// ) {
//     const [initDialogOpen, setInitDialogOpen] = useState(false);

//     console.log(gameStatus)

//     // judge if the game is initialized
//     let isGameInitialized = false
//     let initBtc = true
//     let initUtxo = true
//     if ('Initialize' in gameStatus) {
//         initBtc = gameStatus["Initialize"].init_btc
//         initUtxo = gameStatus["Initialize"].init_key
//     } else {
//         isGameInitialized = true
//     }

//     const finishedInitContent = () => {
//         return <div>
//             <p>
//                 Already Init Btc Utxo
//             </p>
//             <p>
//                 Already Init Pool Key
//             </p>

//         </div>
//     }

//     const needInitContent = () => {
//         return <div>
//             {initBtc ?
//                 <p>
//                     Already Init Btc Utxo
//                 </p> :
//                 <p onClick={
//                     () => {
//                         setInitDialogOpen(true)
//                     }
//                 }>Init Btc Utxo</p>
//             }
//             {
//                 initUtxo ?
//                     <p>
//                         Already Init Pool Key
//                     </p> :
//                     <p onClick={
//                         async () => {
//                             let r = await cookieActor.init_key()
//                             console.log(r)
//                             window.location.reload()
//                         }
//                     }>Init Pool Key</p>

//             }

//             <InitBtcUtxoDialog isOpen={initDialogOpen} setIsOpen={(isOpen) => setInitDialogOpen(isOpen)} />
//         </div>
//     }
//     return <div>
//         {
//             isGameInitialized ?
//                 finishedInitContent() :
//                 needInitContent()
//         }
//     </div>
// }

function PlayGame({
    gameStatus,
    setStep
}: {
    gameStatus: GameStatus,
    setStep: (step: number) => void
}) {
    const { address, paymentAddress, connect } = useLaserEyes();
    const [isRegistered, setIsRegistered] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)
    const [lastClaimTime, setLastClaimTime] = useState<bigint>(BigInt(0))
    const [claimCoolingDown, setClaimCoolingDown] = useState<bigint>(BigInt(0))
    const [claimedCookies, setClaimedCookies] = useState<bigint>(BigInt(0))
    const [cookieAmountPerClick, setCookieAmountPerClick] = useState<bigint>(BigInt(0))
    const [messageApi, contextHolder] = message.useMessage();
    const [isGameEnd, setIsGameEnd] = useState(stateStepIndex(gameStatus) > 2);
    const btcUtxos = useWalletBtcUtxos();
    const { identity, identityAddress, clear } = useSiwbIdentity();

    useEffect(() => {

        (async () => {
            if (!address) {
                return
            }
            setLoading(false)
            const game_and_gamer_infos = await cookieActor.get_game_and_gamer_infos(address)
            const gamer_opt = game_and_gamer_infos.gamer
            if (gamer_opt.length === 0) {
                setIsRegistered(false)
            } else {
                setIsRegistered(true)
                const gamer = gamer_opt[0]!
                setLastClaimTime(gamer.last_click_time)
                setClaimedCookies(gamer.cookies)
            }
            // setGameStartTime(game_and_gamer_infos.game_start_time)
            // setGameEndTime(game_and_gamer_infos.game_duration + game_and_gamer_infos.game_start_time)
            setClaimCoolingDown(game_and_gamer_infos.cookie_amount_per_claim)
            setCookieAmountPerClick(game_and_gamer_infos.cookie_amount_per_claim)
        })()
    }, [address])

    const clickClaim = async () => {
        console.log("try to claim cookies")
        let res = await cookieActorWithIdentity(identity!).claim()
        console.log({ res })
        if ("Ok" in res) {
            messageApi.open({
                type: 'success',
                content: 'Claim Success',
            });
            setClaimedCookies(claimedCookies + cookieAmountPerClick)
            setLastClaimTime(BigInt(Math.floor(Date.now() / 1000)))
            // setClaimResultSuccess(true)
        } else {
            messageApi.open({
                type: 'error',
                content: 'Claim Failed',
            });
        }
    }

    return <div>
        {contextHolder}
        <div className="flex flex-col items-center justify-center">
            <img src="/icon.png" />
            {isGameEnd ?
                <div>Game Is End</div> :
                paymentAddress ?
                    !loading ?
                        (isRegistered ?
                            <Claim
                                lastClaimTime={lastClaimTime}
                                claimCoolingDown={claimCoolingDown}
                                claimedCookies={claimedCookies}
                                cookieAmountPerClick={cookieAmountPerClick}
                                onClaim={clickClaim}
                            />
                            :
                            <Register
                                paymentAddress={paymentAddress}
                                paymentAddressUtxos={btcUtxos} />
                        )
                        : <Skeleton />
                    :
                    <Button size="large" onClick={() => connect(UNISAT)}>Connect Wallet</Button>
            }
            {
                isGameEnd
                    ?
                    null
                    :
                    <Button style={{ marginTop: '10px' }} size="large" onClick={
                        async () => {
                            cookieActor.end_game().then(
                                () => {
                                    window.location.reload()
                                }
                            )
                        }
                    }>End Game</Button>
            }

        </div>
    </div>
}

function EndGame({
    gameStatus,
    setStep
}: {
    gameStatus: GameStatus,
    setStep: (step: number) => void
}) {
    const [isGameEnd, setIsGameEnd] = useState(stateStepIndex(gameStatus) > 1);
    return <div>
        {isGameEnd ?
            <p>Game Already End</p>
            :
            <Button className="mt-5" size="large" onClick={
                async () => {
                    cookieActor.end_game().then(
                        () => {
                            window.location.reload()
                        }
                    )
                }
            }>End Game</Button>
        }
    </div>
}

function SetRuneInfo({
    gameStatus,
    setStep
}: {
    gameStatus: GameStatus,
    setStep: (step: number) => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    return <div>
        {stateStepIndex(gameStatus) >= 3 ?
            <p>Rune Info Already Set</p>
            :
            <Button onClick={() => setIsOpen(true)}>
                Set Rune Info
            </Button>
        }

        <InitUtxoDialog
            isOpen={isOpen}
            setIsOpen={setIsOpen}
        />
    </div>

}

// function AddLiquidity({
//     gameStatus,
//     setStep
// }: {
//     gameStatus: GameStatus,
//     setStep: (step: number) => void
// }) {
//     return <div>
//         <Button>
//             Add Liquidity
//         </Button>
//     </div>
// }

function Withdraw({
    gameStatus,
}: {
    gameStatus: GameStatus,
}) {

    const { address, signPsbt, paymentAddress } = useLaserEyes();
    const userBtcUtxos = useWalletBtcUtxos();

    const [loading, setLoading] = useState(true)
    const [gamer, setGamer] = useState<Gamer | undefined>(undefined)
    const [withdrawable, setWithdrawable] = useState<boolean>(false)

    useEffect(() => {
        if (!address) {
            setLoading(false)
            setWithdrawable(false)
            return
        }
        (async () => {
            const game_and_gamer_infos = await cookieActor.get_game_and_gamer_infos(address)
            const gamer_opt = game_and_gamer_infos.gamer
            if (gamer_opt.length === 0) {
                setWithdrawable(false)
            } else {
                if (!game_and_gamer_infos.is_end) {
                    setWithdrawable(false)
                    return
                }
                const gamer = gamer_opt[0]!
                setWithdrawable(!gamer.is_withdrawn)
                setGamer(gamer)
            }
            setLoading(false)
        })()
    }, [])

    const withdraw = async () => {
        let cookieExchangeState = await cookieActor.get_exchange_state()
        let runeName = cookieExchangeState.rune_name;
        let runeId = (cookieExchangeState.rune_id as [string])[0]
        let recommendedFeeRate = await ocActor.get_status()
            .then((res: OrchestratorStatus) => {
                return res.mempool_tx_fee_rate.medium
            }).catch((err) => {
                console.log("get recommendedFeeRate error", err);
                throw err;
            })

        const lastState = cookieExchangeState.states.slice(-1)[0]
        let untweakKey = (cookieExchangeState.key as [string])[0]
        console.log({ lastState })

        await withdrawTx({
            userBtcUtxos: userBtcUtxos!,
            runeid: runeId,
            cookiePoolBtcUtxo: convertUtxo(lastState.utxo, untweakKey),
            paymentAddress: paymentAddress!,
            cookiePoolAddress: (cookieExchangeState.address as [string])[0],
            feeRate: Number(recommendedFeeRate.toString()),
            signPsbt: signPsbt,
            cookiePoolNonce: lastState.nonce,
            withdrawAmount: gamer.cookies,
        });


    }

    return <div>
        {
            loading ?
                <Skeleton />
                :
                <Button
                    style={{ marginTop: "2px" }}
                    disabled={!withdrawable}
                    onClick={()=>withdraw()}
                >
                    Withdraw
                </Button>
        }
    </div>
}


function Claim({
    lastClaimTime,
    claimCoolingDown,
    claimedCookies,
    cookieAmountPerClick,
    onClaim
}: {
    lastClaimTime: bigint,
    claimCoolingDown: bigint,
    claimedCookies: bigint,
    cookieAmountPerClick: bigint,
    onClaim: () => void
}) {
    console.log({
        lastClaimTime,
        claimCoolingDown,
        currentTime: Math.floor(Date.now() / 1000)
    })

    return <div className="flex flex-col items-center">
        {claimedCookies >= 0 && <div>{`Claimed Cookies: ${claimedCookies.toString()}`}</div>}
        {
            lastClaimTime + claimCoolingDown > BigInt(Math.floor(Date.now() / 1000)) ?
                <Button disabled>Cooling Down</Button>
                :
                <Button onClick={() => {
                    onClaim()
                }}>Claim {cookieAmountPerClick} Cookies</Button>
        }
    </div>
}

