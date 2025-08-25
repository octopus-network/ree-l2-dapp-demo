import { useLaserEyes } from "@omnisat/lasereyes";
import { Button } from "antd";
import { cookieActor } from "canister/cookie/actor";
import { CookiePoolState, Game, GameAndPool, Gamer, Metadata } from "canister/cookie/service.did";
import { ocActor } from "canister/orchestrator/actor";
import { OrchestratorStatus } from "canister/orchestrator/service.did";
import { COOKIE_EXCHANGE_ID } from "../constants/common";
import { useMemo, useState } from "react";
import { UnspentOutput } from "types";
import { convertUtxo, getP2trAressAndScript, registerTx } from "utils";
import { useLoginUserBtcUtxo, useWalletBtcUtxos } from "hooks/use-utxos";
import { convertUnisatUtxo } from "api/unisat";
import { convertMaestroUtxo } from "api/maestro";
import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";
import { address } from "bitcoinjs-lib";
import { useAtom } from "jotai";
import { Connect } from "vite";
import { connectWalletModalOpenAtom } from "./ConnectDialog";

export function Register({
  game,
  pool_state,
  pool_metadata,
}: 
{
  game: Game;
  pool_state: CookiePoolState;
  pool_metadata: Metadata;
}) {
  const [connectWalletModalOpen, setConnectWalletModalOpen] = useAtom(
    connectWalletModalOpenAtom
  );
  const { signPsbt, paymentAddress, address, publicKey } = useLaserEyes();
  // const [registerTxid, setRegisterTxid] = useState<string | undefined>(undefined)
  //   const btcUtxos = useWalletBtcUtxos();
  const { data: btcUtxos, isLoading: isLoadingUtxo } = useLoginUserBtcUtxo();
  const [isRegistering, setIsRegistering] = useState(false);

  const isLoading = useMemo(() => {
    return isLoadingUtxo;
  }, [isLoadingUtxo]);

  let register = async () => {
    if (!btcUtxos) {
      console.log({ address, paymentAddress, btcUtxos });
      alert("No UTXOs found");
      return;
    }

    const last_state = pool_state;
    console.log({pool_state, pool_metadata})
    const { address: poolAddress, output } = getP2trAressAndScript(
      pool_metadata.key
    );
    // let recommendedFeeRate = await Orchestrator.getRecommendedFee()
    let recommendedFeeRate = await ocActor
      .get_status()
      .then((res: OrchestratorStatus) => {
        return res.mempool_tx_fee_rate.medium;
      })
      .catch((err) => {
        console.log("get recommendedFeeRate error", err);
        throw err;
      });

    let {
      psbt,
      toSpendUtxos,
      toSignInputs,
      poolSpendUtxos,
      poolReceiveUtxos,
      txid,
      fee,
      inputCoins,
      outputCoins,
    } = await registerTx({
      userBtcUtxos: (btcUtxos ?? []).map((e) =>
        convertMaestroUtxo(e, publicKey)
      ),
      poolBtcUtxo: convertUtxo(last_state?.utxo!, pool_metadata.key),
      paymentAddress: paymentAddress,
      poolAddress: poolAddress!,
      feeRate: recommendedFeeRate,
      registerFee: game.gamer_register_fee,
    });


    console.log(psbt);
    console.log(psbt.toHex());

    const psbtBase64 = psbt.toBase64();
    const res = await signPsbt(psbtBase64);
    let signedPsbtHex = res?.signedPsbtHex;

    if (!signedPsbtHex) {
      throw new Error("failed to sign psbt");
    }

    console.log({
      fee,
      address,
      inputCoins,
      poolSpendUtxos,
      poolReceiveUtxos,
      outputCoins,
    });

    await ocActor
      .invoke({
        intention_set: {
          tx_fee_in_sats: BigInt(fee),
          initiator_address: address,
          intentions: [
            {
              action: "register",
              exchange_id: COOKIE_EXCHANGE_ID,
              input_coins: inputCoins,
              pool_utxo_spent: [],
              pool_utxo_received: [],
              output_coins: outputCoins,
              pool_address: pool_metadata.address,
              action_params: JSON.stringify({
                game_id: Number(game.game_id),
              }),
              nonce: BigInt(last_state!.nonce),
            },
          ],
        },
        psbt_hex: signedPsbtHex,
        initiator_utxo_proof: [],
      })
      .then((res) => {
        if ("Err" in res) {
          throw new Error(res.Err);
        }
        alert("Register Success" + JSON.stringify(res.Ok));

        // reload page
        window.location.reload();
        return res.Ok;
      })
      .catch((err) => {
        console.log("invoke error", err);
        throw err;
      });

    // let register_txid = await Orchestrator.invoke({
    //     intention_set: {
    //         initiator_address: paymentAddress,
    //         intentions: [
    //             {
    //                 action: "register",
    //                 exchange_id: EXCHANGE_ID,
    //                 input_coins: inputCoins,
    //                 pool_utxo_spend: [poolSpendUtxos],
    //                 pool_utxo_receive: [poolReceiveUtxos],
    //                 output_coins: outputCoins,
    //                 pool_address: register_info.address,
    //                 action_params: "",
    //                 nonce: BigInt(register_info.nonce),
    //             },
    //         ],
    //     },
    //     psbt_hex: signedPsbtHex,
    // })
    // setRegisterTxid(JSON.stringify(register_txid))
  };

  return (
    <div>
      {address ? (
        <Button
          loading={isLoading}
          onClick={() => {
            setIsRegistering(true);
            register()
              .catch((e) => {
                alert("Register Failed: " + e.message);
                console.error(e);
              })
              .finally(() => {
                setIsRegistering(false);
              });
          }}
        >
          register
        </Button>
      ) : (
        <Button onClick={() => setConnectWalletModalOpen(true)}>
          Connet Wallet
        </Button>
      )}

      {/* <label>{JSON.stringify(btcUtxos)}</label> */}
      {/* <label>{psbt?.toHex()}</label> */}
      {/* <label>{JSON.stringify(registerTxid)}</label> */}
    </div>
  );
}
