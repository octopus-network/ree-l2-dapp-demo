import { useLaserEyes } from "@omnisat/lasereyes";
import { Button } from "antd";
import { cookieActor, get_btc_pool } from "canister/cookie/actor";
import { Game } from "canister/cookie/service.did";
import { ocActor } from "canister/orchestrator/actor";
import { OrchestratorStatus } from "canister/orchestrator/service.did";
import { COOKIE_EXCHANGE_ID } from "constants/common";
import { useState } from "react";
import { UnspentOutput } from "types";
import { convertUtxo, getP2trAressAndScript, registerTx } from "utils";

export function Register({
    game,
    paymentAddress,
    paymentAddressUtxos
}: {
    game: Game,
    paymentAddress: string;
    paymentAddressUtxos: UnspentOutput[] | undefined;
}) {
    const { signPsbt } = useLaserEyes()

    const register = async () => {
        if (!paymentAddressUtxos) {
            return
        }
        // let register_info: RegisterInfo = await cookieActor.get_register_info()
        const btc_pool = get_btc_pool(game)
        const last_state = btc_pool.states[btc_pool.states.length - 1];
        const { address: poolAddress, output } = getP2trAressAndScript(btc_pool.pubkey);
        console.log({ poolAddress, output })
        console.log("fuck", JSON.stringify(paymentAddressUtxos))
        // let recommendedFeeRate = await Orchestrator.getRecommendedFee()
        const recommendedFeeRate = await ocActor.get_status()
            .then((res: OrchestratorStatus) => {
                return res.mempool_tx_fee_rate.medium
            }).catch((err) => {
                console.log("get recommendedFeeRate error", err);
                throw err;
            })

        const {
            psbt,
            poolSpendUtxos,
            poolReceiveUtxos,
            fee,
            inputCoins,
            outputCoins,
        } = await registerTx(
            {
                userBtcUtxos: paymentAddressUtxos!,
                poolBtcUtxo: convertUtxo(last_state!.utxo!, btc_pool.pubkey),
                paymentAddress,
                poolAddress: poolAddress!,
                feeRate: recommendedFeeRate,
                registerFee: game.gamer_register_fee,
            }
        )

        console.log(psbt.toHex())

        const psbtBase64 = psbt.toBase64();
        const res = await signPsbt(psbtBase64);
        const signedPsbtHex = res?.signedPsbtHex;

        if (!signedPsbtHex) {
            throw new Error("failed to sign psbt")
        }

        console.log({
            fee,
            paymentAddress,
            inputCoins,
            poolSpendUtxos,
            poolReceiveUtxos,
            outputCoins,
        })

        const register_txid = await ocActor.invoke({
            'intention_set': {
                tx_fee_in_sats: BigInt(fee),
                initiator_address: paymentAddress,
                intentions: [
                    {
                        action: "register",
                        exchange_id: COOKIE_EXCHANGE_ID,
                        input_coins: inputCoins,
                        pool_utxo_spend: [poolSpendUtxos],
                        pool_utxo_receive: [poolReceiveUtxos],
                        output_coins: outputCoins,
                        pool_address: btc_pool.address,
                        action_params: "",
                        nonce: BigInt(last_state!.nonce),
                    },
                ],
            },
            psbt_hex: signedPsbtHex,
        }).then((res) => {
            if ('Err' in res) {
                throw new Error(res.Err);
            }
            alert("Register Success, txid: " + register_txid);
            return res.Ok;
        }).catch((err) => {
            console.log("invoke error", err);
            throw err;
        })

    }

    return (
        <div>
            <Button onClick={register}>register</Button>
            {/* <label>{JSON.stringify(btcUtxos)}</label> */}
            {/* <label>{psbt?.toHex()}</label> */}
            {/* <label>{JSON.stringify(registerTxid)}</label> */}
        </div>
    )

}