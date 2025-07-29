import {
  AddressType,
  InputCoin,
  OutputCoin,
  ToSignInput,
  TxOutputType,
  UnspentOutput,
} from "../../types";
import { Transaction } from "../transaction";
import { addressTypeToString, getAddressType } from "../address";
import {
  estimate_min_tx_fee,
  ocActor,
} from "../../canister/orchestrator/actor";
import {
  BITCOIN,
  COOKIE_EXCHANGE_ID,
  RICHSWAP_EXCHANGE_ID,
  UTXO_DUST,
} from "../../constants";
import * as bitcoin from "bitcoinjs-lib";
// import { Edict, RuneId, Runestone, none } from "../../utils/runelib";
import { InvokeArgs } from "../../canister/orchestrator/service.did";
import { Edict, RuneId, Runestone, none } from "runelib";

export async function addLiquidityTx({
  userBtcUtxos,
  btcAmountForAddLiquidity,
  runeid,
  gameid,
  runeAmountForAddLiquidity,
  cookiePoolUtxo,
  paymentAddress,
  swapPoolAddress,
  cookiePoolAddress,
  feeRate,
  signPsbt,
  cookiePoolNonce,
  swapPoolNonce,
}: {
  userBtcUtxos: UnspentOutput[];
  btcAmountForAddLiquidity: bigint;
  runeid: string;
  gameid: number;
  runeAmountForAddLiquidity: bigint;
  cookiePoolUtxo: UnspentOutput;
  paymentAddress: string;
  swapPoolAddress: string;
  // swapPoolUtxo: UnspentOutput;
  cookiePoolAddress: string;
  feeRate: number;
  signPsbt: any;
  cookiePoolNonce: bigint;
  swapPoolNonce: bigint;
}) {
  // let inputBtcAmount =
  const tx = new Transaction();

  tx.setFeeRate(feeRate);
  tx.setEnableRBF(false);
  tx.setChangeAddress(paymentAddress);

  //   let userBtcAmount = userBtcUtxos.reduce(
  //     (acc, utxo) => acc + BigInt(utxo.satoshis),
  //     BigInt(0)
  //   );
  //   console.log({ userBtcAmount });

  let inputTypes: TxOutputType[] = [];
  let outputTypes: TxOutputType[] = [];

  // input 0 pool btc utxo
  tx.addInput(cookiePoolUtxo);
  inputTypes.push(addressTypeToString(getAddressType(cookiePoolUtxo.address)));

  // input 1-n user utxo
  //   console.log({ userBtcUtxos });
  //   userBtcUtxos.forEach((utxo) => {
  //     tx.addInput(utxo);
  //     inputTypes.push(addressTypeToString(getAddressType(utxo.address)));
  //   });

  // output

  // cookie btc pool
  // output 0
  tx.addOutput(
    cookiePoolAddress,
    BigInt(cookiePoolUtxo.satoshis) - btcAmountForAddLiquidity
  );
  outputTypes.push(addressTypeToString(getAddressType(cookiePoolAddress)));

  // swap pool
  // output 1
  tx.addOutput(swapPoolAddress, btcAmountForAddLiquidity);
  outputTypes.push(addressTypeToString(getAddressType(swapPoolAddress)));

  // edict & op return
  const [runeBlock, runeIdx] = runeid.split(":");
  const { id: cookieRuneId, amount: cookiePoolRuneAmount } =
    cookiePoolUtxo.runes.find((rune) => rune.id === runeid)!;
  const edicts = [
    new Edict(
      new RuneId(Number(runeBlock), Number(runeIdx)),
      BigInt(cookiePoolRuneAmount) - runeAmountForAddLiquidity,
      0
    ),
    new Edict(
      new RuneId(Number(runeBlock), Number(runeIdx)),
      BigInt(runeAmountForAddLiquidity),
      1
    ),
  ];

  const runestone = new Runestone(edicts, none(), none(), none());
  console.log({ runestone });

  const opReturnScript = runestone.encipher();

  // OP_RETURN
  tx.addScriptOutput(opReturnScript, BigInt(0));

  // user
  // add change utxo
  outputTypes.push(addressTypeToString(getAddressType(paymentAddress)));

  // user input as tx fee
  let userBtcAmount = BigInt(0);
  let fee = BigInt(0);
  for (let i = 0; i < userBtcUtxos.length && i < 10; i++) {
    const utxo = userBtcUtxos[i]!;
    tx.addInput(utxo);
    inputTypes.push(addressTypeToString(getAddressType(utxo.address)));
    userBtcAmount += BigInt(utxo.satoshis);
    fee = await estimate_min_tx_fee(
      inputTypes,
      [cookiePoolAddress],
      outputTypes
    );
    fee = fee + fee;
    if (userBtcAmount >= fee) break;
  }
  if (userBtcAmount < fee) {
    throw new Error("Insufficient UTXO(s)");
  }

  let change_amount = BigInt(userBtcAmount) - fee;

  if (change_amount < 0) {
    throw new Error("Inssuficient UTXO(s)");
  } else if (change_amount <= UTXO_DUST) {
    outputTypes.pop();
  } else {
    tx.addOutput(paymentAddress, change_amount);
  }

  console.log({ tx });
  const inputs = tx.getInputs();
  const psbt = tx.toPsbt();
  //@ts-expect-error: todo
  const unsignedTx = psbt.__CACHE.__TX;
  const toSignInputs: ToSignInput[] = [];
  const toSpendUtxos = inputs
    .filter(({ utxo }, index) => {
      const isUserInput =
        utxo.address === paymentAddress || utxo.address === paymentAddress;
      const addressType = getAddressType(utxo.address);
      if (isUserInput) {
        toSignInputs.push({
          index,
          ...(addressType === AddressType.P2TR
            ? { address: utxo.address, disableTweakSigner: false }
            : { publicKey: utxo.pubkey, disableTweakSigner: true }),
        });
      }
      return isUserInput;
    })
    .map((input) => input.utxo);
  const unsignedTxClone = unsignedTx.clone();

  for (let i = 0; i < toSignInputs.length; i++) {
    const toSignInput = toSignInputs[i]!;

    const toSignIndex = toSignInput!.index;
    const input = inputs[toSignIndex]!;
    const inputAddress = input.utxo.address;
    if (!inputAddress) continue;
    const redeemScript = psbt.data.inputs[toSignIndex]!.redeemScript;
    const addressType = getAddressType(inputAddress);

    if (redeemScript && addressType === AddressType.P2SH_P2WPKH) {
      const finalScriptSig = bitcoin.script.compile([redeemScript!]);
      unsignedTxClone.setInputScript(toSignIndex, finalScriptSig);
    }
  }

  const txid = unsignedTxClone.getId();
  console.log({ psbt });
  const psbtBase64 = psbt.toBase64();
  const res = await signPsbt(psbtBase64);
  let signedPsbtHex = res?.signedPsbtHex;

  let invoke_arg: InvokeArgs = {
    initiator_utxo_proof: [],
    intention_set: {
      tx_fee_in_sats: BigInt(fee),
      initiator_address: paymentAddress,
      intentions: [
        {
          action: "add_liquidity",
          exchange_id: COOKIE_EXCHANGE_ID,
          input_coins: [],
          pool_utxo_spent: [],
          pool_utxo_received: [],
          output_coins: [
            {
              to: swapPoolAddress,
              coin: {
                id: runeid,
                value: BigInt(runeAmountForAddLiquidity),
              },
            },
            {
              to: swapPoolAddress,
              coin: {
                id: BITCOIN.id,
                value: BigInt(btcAmountForAddLiquidity),
              },
            },
          ],
          pool_address: cookiePoolAddress,
          action_params: JSON.stringify({
            game_id: gameid,
          }),
          nonce: cookiePoolNonce,
        },
        {
          action: "add_liquidity",
          exchange_id: RICHSWAP_EXCHANGE_ID,
          input_coins: [
            {
              from: cookiePoolAddress,
              coin: {
                id: BITCOIN.id,
                value: btcAmountForAddLiquidity,
              },
            },
            {
              from: cookiePoolAddress,
              coin: {
                id: runeid,
                value: runeAmountForAddLiquidity,
              },
            },
          ],
          pool_utxo_spent: [],
          pool_utxo_received: [],
          output_coins: [],
          pool_address: swapPoolAddress,
          action_params: "",
          nonce: swapPoolNonce,
        },
      ],
    },
    psbt_hex: signedPsbtHex,
  };

  console.log({ invoke_arg: JSON.stringify(invoke_arg, bigIntReplacer) });
  await ocActor
    .invoke(invoke_arg)
    .then((res) => {
      if ("Err" in res) {
        throw new Error(res.Err);
      }
      console.log("invoke success and txid ", res.Ok);
      alert("Add Liquidity Success: " + res.Ok);
      // reload page
      window.location.reload();
      return res.Ok;
    })
    .catch((err) => {
      console.log("invoke error", err);
      alert("Add Liquidity Failed: " + err);
      // reload page
      window.location.reload();
      throw err;
    });
}

function bigIntReplacer(_key: string, value: any): any {
  return typeof value === "bigint" ? value.toString() : value;
}
