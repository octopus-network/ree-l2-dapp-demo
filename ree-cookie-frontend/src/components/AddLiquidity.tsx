import { cookieActor } from "../canister/cookie/actor"
import { GameStatus, Utxo } from "../canister/cookie/service.did"
import { ocActor } from "../canister/orchestrator/actor"
import { OrchestratorStatus } from "../canister/orchestrator/service.did"
import { swapActor } from "../canister/rich-swap/actor"
import { PoolBasic } from "../canister/rich-swap/service.did"
import { useWalletBtcUtxos } from "../hooks/use-utxos"
import { convertUtxo } from "../utils"
import { addLiquidityTx } from "../utils/tx-helper/addLiquidity"
import { useLaserEyes } from "@omnisat/lasereyes"
import { Button, Skeleton } from "antd"
import { useEffect, useState } from "react"
import { stateStepIndex } from "./GameSteps"

export function AddLiquidity({
    gameStatus,
}: {
    gameStatus: GameStatus,
}) {
    const [registerTxid, setRegisterTxid] = useState<string | undefined>(undefined)
    const [loadingCookiePool, setLoadingCookiePool] = useState(true)
    const [cookiePool, setCookiePool] = useState<PoolBasic | undefined>(undefined)
    const { address, paymentAddress, connect, signPsbt } = useLaserEyes();
    const userBtcUtxos = useWalletBtcUtxos();

    useEffect(() => {
        const s = async () => {
            let cookieExchangeState = await cookieActor.get_exchange_state()
            console.log({ cookieExchangeState })
            let runeName = cookieExchangeState.rune_name;
            console.log({ runeName })
            let pool_list = await swapActor.get_pool_list()
            console.log({pool_list})
            let pool = pool_list.find(e => e.name === runeName)
            console.log({ pool })
            if (pool) {
                setCookiePool(pool)
                console.log({ pool })
            }
            setLoadingCookiePool(false)
        }

        s()
    }, [])

    const createPool = async () => {
        let cookieExchangeState = await cookieActor.get_exchange_state()
        let pubkey = await swapActor.create(
            (cookieExchangeState.rune_id as [string])[0]
        ).then((data) => {
            if ("Ok" in data) {
                window.location.reload()
            } else {
                throw new Error(data.Err ? Object.keys(data.Err)[0] : "Unknown Error");
            }
        })
        console.log({ pubkey })
    }

    const addLiquidity = async () => {
        let cookieExchangeState = await cookieActor.get_exchange_state()
        let addLiquidityInfo = await cookieActor.query_add_liquidity_info()
        let runeName = cookieExchangeState.rune_name;
        let runeId = (cookieExchangeState.rune_id as [string])[0]
        let swapPool = (await swapActor.get_pool_list()).find(e => e.name == runeName)!
        let untweakKey = (cookieExchangeState.key as [string])[0]
        let liquidityOffer = await swapActor.pre_add_liquidity(swapPool.address, {
            id: runeId,
            value: addLiquidityInfo.rune_amount_for_add_liquidity,
        }).then((res) => {
            if ("Ok" in res) {
                return res.Ok
            } else {
                throw new Error(res.Err ? Object.keys(res.Err)[0] : "Unknown Error");
            }
        });
        // let register_info: RegisterInfo = (await cookieActor.get_register_info()).untweaked_key

        let recommendedFeeRate = await ocActor.get_status()
            .then((res: OrchestratorStatus) => {
                return res.mempool_tx_fee_rate.medium
            }).catch((err) => {
                console.log("get recommendedFeeRate error", err);
                throw err;
            })
        // const btcAmountForAddLiquidity = cookieExchangeState.game.

        const lastState = cookieExchangeState.states.slice(-1)[0]
        console.log({ lastState })

        await addLiquidityTx({
            userBtcUtxos: userBtcUtxos!,
            btcAmountForAddLiquidity: addLiquidityInfo.btc_amount_for_add_liquidity,
            runeid: runeId,
            runeAmountForAddLiquidity: addLiquidityInfo.rune_amount_for_add_liquidity,
            cookiePoolBtcUtxo: convertUtxo(lastState.utxo, untweakKey),
            // cookiePoolRuneUtxo: convertUtxo((lastState.rune_utxo as [Utxo])[0], untweakKey),
            paymentAddress: paymentAddress!,
            swapPoolAddress: swapPool.address,
            cookiePoolAddress: (cookieExchangeState.address as [string])[0],
            feeRate: Number(recommendedFeeRate.toString()),
            signPsbt: signPsbt,
            cookiePoolNonce: lastState.nonce,
            swapPoolNonce: liquidityOffer.nonce,
        })
    }


    return <div>
        {
            loadingCookiePool ?
                <Skeleton />
                :
                <div>
                    {
                        cookiePool ?
                            <p>
                                Already Create Pool, Pool Name: {cookiePool.name}, Pool Address: {cookiePool.address}
                            </p> :
                            <Button onClick={() => createPool()}>
                                Create Pool
                            </Button>
                    }
                    <br/>
                    {
                        stateStepIndex(gameStatus) >3?
                        <p>
                            Already Add Liquidity
                        </p>
                        : 
                        <Button onClick={() => addLiquidity()}>
                        Add Liquidity
                    </Button>
                    }
                </div>
        }
    </div>
}

