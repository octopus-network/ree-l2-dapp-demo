import { AddressType, ToSignInput, TxOutputType, UnspentOutput } from "../../types";
import { Transaction } from "../transaction";
import { addressTypeToString, getAddressType } from "../address";
import { Edict, RuneId, Runestone, none } from "runelib";
import { COOKIE_EXCHANGE_ID, UTXO_DUST } from "../../constants";
import { ocActor } from "../../canister/orchestrator/actor";
import * as bitcoin from "bitcoinjs-lib";

export async function withdrawTx({
    userBtcUtxos,
    runeid,
    cookiePoolBtcUtxo,
    paymentAddress,
    cookiePoolAddress,
    feeRate,
    signPsbt,
    cookiePoolNonce,
    withdrawAmount
}: {
    userBtcUtxos: UnspentOutput[],
    runeid: string;
    cookiePoolBtcUtxo: UnspentOutput;
    paymentAddress: string;
    cookiePoolAddress: string;
    feeRate: number;
    signPsbt: any;
    cookiePoolNonce: bigint;
    withdrawAmount: bigint;

}) {
    let userBtcAmount = userBtcUtxos.reduce((acc, utxo) => acc + BigInt(utxo.satoshis), BigInt(0))

    const tx = new Transaction();

    tx.setFeeRate(feeRate);
    tx.setEnableRBF(false);
    tx.setChangeAddress(paymentAddress);

    let inputTypes: TxOutputType[] = []
    let outputTypes: TxOutputType[] = []

    // input 0 cookie pool utxo
    tx.addInput(cookiePoolBtcUtxo)
    inputTypes.push(
        addressTypeToString(getAddressType(cookiePoolBtcUtxo.address))
    )

    // input 1-n user utxo
    userBtcUtxos.forEach(utxo => {
        tx.addInput(utxo)
        inputTypes.push(
            addressTypeToString(getAddressType(utxo.address))
        )
    })

    // output

    // output 0 cookie pool
    tx.addOutput(
        cookiePoolAddress,
        BigInt(cookiePoolBtcUtxo.satoshis)
    )
    outputTypes.push(
        addressTypeToString(getAddressType(cookiePoolAddress))
    )

    // output 1, user receive cookie rune
    tx.addOutput(
        paymentAddress,
        BigInt(UTXO_DUST)
    )
    outputTypes.push(
        addressTypeToString(getAddressType(paymentAddress))
    )

    // edict & op return
    const cookiePoolRune = cookiePoolBtcUtxo.runes.find(rune => rune.id === runeid)!;
    const changeRuneAmount = BigInt(cookiePoolRune.amount) - withdrawAmount
    const [runeBlock, runeIdx] = runeid.split(":");

    const needChange = changeRuneAmount > 0;

    const edicts = needChange
        ? [
            new Edict(
                new RuneId(Number(runeBlock), Number(runeIdx)),
                changeRuneAmount,
                0
            ),
            new Edict(
                new RuneId(Number(runeBlock), Number(runeIdx)),
                withdrawAmount,
                1
            ),
        ]
        :
        [
            new Edict(
                new RuneId(Number(runeBlock), Number(runeIdx)),
                withdrawAmount,
                1
            ),
        ];

    const runestone = new Runestone(edicts, none(), none(), none());

    console.log({ runestone })

    const opReturnScript = runestone.encipher();

    // OP_RETURN
    tx.addScriptOutput(opReturnScript, BigInt(0));

    // user
    // add change utxo
    outputTypes.push(
        addressTypeToString(getAddressType(paymentAddress)),
    )

    let fee = await ocActor.estimate_min_tx_fee({
        'input_types': inputTypes,
        'pool_address': [cookiePoolAddress],
        'output_types': outputTypes,
    }).then((res: { 'Ok': bigint } | { 'Err': string }) => {
        if ('Err' in res) {
            throw new Error(res.Err);
        }
        return res.Ok
    }).catch((err) => {
        console.log("invoke error", err);
        throw err;
    });

    fee = fee + fee

    let change_amount = BigInt(userBtcAmount) - fee - UTXO_DUST;

    if (change_amount < 0) {
        throw new Error("Inssuficient UTXO(s)");
    } else if (change_amount <= UTXO_DUST) {
        outputTypes.pop()
    } else {
        tx.addOutput(paymentAddress, change_amount)
    }

    const inputs = tx.getInputs();
    const psbt = tx.toPsbt();
    //@ts-expect-error: todo
    const unsignedTx = psbt.__CACHE.__TX;
    const toSignInputs: ToSignInput[] = [];
    const unsignedTxClone = unsignedTx.clone();

    for (let i = 0; i < toSignInputs.length; i++) {
        const toSignInput = toSignInputs[i]!;

        const toSignIndex = toSignInput.index;
        const input = inputs[toSignIndex];
        const inputAddress = input!.utxo.address;
        if (!inputAddress) continue;
        const redeemScript = psbt.data.inputs[toSignIndex]!.redeemScript;
        const addressType = getAddressType(inputAddress);

        if (redeemScript && addressType === AddressType.P2SH_P2WPKH) {
            const finalScriptSig = bitcoin.script.compile([redeemScript!]);
            unsignedTxClone.setInputScript(toSignIndex, finalScriptSig);
        }
    }

    const txid = unsignedTxClone.getId();
    const psbtBase64 = psbt.toBase64();
    const res = await signPsbt(psbtBase64);
    let signedPsbtHex = res?.signedPsbtHex;

    let register_txid = await ocActor.invoke({
        'intention_set': {
            tx_fee_in_sats: BigInt(fee),
            initiator_address: paymentAddress,
            intentions: [
                {
                    action: "withdraw",
                    exchange_id: COOKIE_EXCHANGE_ID,
                    input_coins: [],
                    pool_utxo_spent: [],
                    pool_utxo_received: [],
                    output_coins: [
                        {
                            to: paymentAddress,
                            coin: {
                                id: runeid,
                                value: withdrawAmount,
                            }
                        },
                    ],
                    pool_address: cookiePoolAddress,
                    action_params: "",
                    nonce: cookiePoolNonce,
                }],
        },
        psbt_hex: signedPsbtHex,
        initiator_utxo_proof: [],
    }).then((res) => {
        if ('Err' in res) {
            throw new Error(res.Err);
        }
        console.log({res})
        return res.Ok;
    }).catch((err) => {
        console.log("invoke error", err);
        throw err;
    })

}