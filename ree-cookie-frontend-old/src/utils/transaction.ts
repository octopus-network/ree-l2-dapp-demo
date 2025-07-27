import { AddressType, UnspentOutput } from "../types";
import {
  hexToBytes,
  bytesToHex,
  getEstimateAddress,
  addressToScriptPk,
  getAddedVirtualSize,
  selectBtcUtxos,
  toPsbtNetwork,
} from "../utils";
import { ToSignInput } from "../types";
import { NETWORK, UTXO_DUST } from "../constants";

import * as bitcoin from "bitcoinjs-lib";
import { ECPairAPI, ECPairFactory } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";

const ECPair: ECPairAPI = ECPairFactory(ecc);

interface TxInput {
  data: {
    hash: string;
    index: number;
    witnessUtxo?: { value: bigint; script: Uint8Array };
    tapInternalKey?: Uint8Array;
    nonWitnessUtxo?: Uint8Array;
  };
  utxo: UnspentOutput;
}

interface TxOutput {
  address?: string;
  script?: Uint8Array;
  value: bigint;
}

function utxoToInput(utxo: UnspentOutput, estimate?: boolean): TxInput {
  let data: any = {
    hash: utxo.txid,
    index: utxo.vout,
    witnessUtxo: {
      value: BigInt(utxo.satoshis),
      script: hexToBytes(utxo.scriptPk),
    },
  };
  if (
    (utxo.addressType === AddressType.P2TR ||
      utxo.addressType === AddressType.M44_P2TR) &&
    utxo.pubkey
  ) {
    const pubkey =
      utxo.pubkey.length === 66 ? utxo.pubkey.slice(2) : utxo.pubkey;
    data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: BigInt(utxo.satoshis),
        script: hexToBytes(utxo.scriptPk),
      },
      tapInternalKey: hexToBytes(pubkey),
    };
  } else if (utxo.addressType === AddressType.P2PKH) {
    if (!utxo.rawtx || estimate) {
      const data = {
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          value: BigInt(utxo.satoshis),
          script: hexToBytes(utxo.scriptPk),
        },
      };
      return {
        data,
        utxo,
      };
    }
  } else if (utxo.addressType === AddressType.P2SH_P2WPKH && utxo.pubkey) {
    const redeemData = bitcoin.payments.p2wpkh({
      pubkey: hexToBytes(utxo.pubkey),
      network: toPsbtNetwork(NETWORK),
    });

    data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: BigInt(utxo.satoshis),
        script: hexToBytes(utxo.scriptPk),
      },
      redeemScript: redeemData.output,
    };
  }

  return {
    data,
    utxo,
  };
}

/**
 * Transaction
 */
export class Transaction {
  private utxos: UnspentOutput[] = [];
  private inputs: TxInput[] = [];
  public outputs: TxOutput[] = [];
  private changeOutputIndex = -1;
  public changedAddress: string = "";

  private feeRate: number = 0;
  private enableRBF = true;
  private _cacheNetworkFee = 0;
  private _cacheBtcUtxos: UnspentOutput[] = [];
  private _cacheToSignInputs: ToSignInput[] = [];
  constructor() {}

  setEnableRBF(enable: boolean) {
    this.enableRBF = enable;
  }

  setFeeRate(feeRate: number) {
    this.feeRate = feeRate;
  }

  setChangeAddress(address: string) {
    this.changedAddress = address;
  }

  addInput(utxo: UnspentOutput) {
    this.utxos.push(utxo);
    this.inputs.push(utxoToInput(utxo));
  }

  removeLastInput() {
    this.utxos = this.utxos.slice(0, -1);
    this.inputs = this.inputs.slice(0, -1);
  }

  getTotalInput() {
    return this.inputs.reduce(
      (pre, cur) => pre + BigInt(cur.utxo.satoshis),
      BigInt(0)
    );
  }

  getTotalOutput() {
    return this.outputs.reduce((pre, cur) => pre + cur.value, BigInt(0));
  }

  getUnspent() {
    return this.getTotalInput() - this.getTotalOutput();
  }

  getInputs() {
    return this.inputs;
  }

  calNetworkFee() {
    const psbt = this.createEstimatePsbt();
    const txSize = psbt.extractTransaction(true).virtualSize();
    const fee = Math.ceil(txSize * 1.06 * this.feeRate);
    return fee;
  }

  addOutput(address: string, value: bigint) {
    this.outputs.push({
      address,
      value,
    });
  }

  addOpreturn(data: Buffer[]) {
    const embed = bitcoin.payments.embed({ data });
    this.outputs.push({
      script: embed.output,
      value: BigInt(0),
    });
  }

  addScriptOutput(script: Buffer, value: bigint) {
    this.outputs.push({
      script,
      value,
    });
  }

  getOutput(index: number) {
    return this.outputs[index];
  }

  addChangeOutput(value: bigint) {
    this.outputs.push({
      address: this.changedAddress,
      value,
    });
    this.changeOutputIndex = this.outputs.length - 1;
  }

  getChangeOutput() {
    return this.outputs[this.changeOutputIndex];
  }

  getChangeAmount() {
    const output = this.getChangeOutput();
    return output ? output.value : 0;
  }

  removeChangeOutput() {
    this.outputs.splice(this.changeOutputIndex, 1);
    this.changeOutputIndex = -1;
  }

  removeRecentOutputs(count: number) {
    this.outputs.splice(-count);
  }

  toPsbt() {
    const psbt = new bitcoin.Psbt({
      network: toPsbtNetwork(NETWORK),
    });
    this.inputs.forEach((v, index) => {
      if (v.utxo.addressType === AddressType.P2PKH) {
        if (v.data.witnessUtxo) {
          //@ts-expect-error: todo
          psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = true;
        }
      }
      psbt.data.addInput(v.data);
      if (this.enableRBF) {
        psbt.setInputSequence(index, 0xfffffffd);
      }
    });
    this.outputs.forEach((v) => {
      if (v.address) {
        psbt.addOutput({
          address: v.address,
          value: v.value,
        });
      } else if (v.script) {
        psbt.addOutput({
          script: v.script,
          value: v.value,
        });
      }
    });

    return psbt;
  }

  clone() {
    const tx = new Transaction();

    tx.setFeeRate(this.feeRate);
    tx.setEnableRBF(this.enableRBF);
    tx.setChangeAddress(this.changedAddress);
    tx.utxos = this.utxos.map((v) => Object.assign({}, v));
    tx.inputs = this.inputs.map((v) => v);
    tx.outputs = this.outputs.map((v) => v);
    return tx;
  }

  createEstimatePsbt() {
    const network = toPsbtNetwork(NETWORK);
    const ecpair = ECPair.makeRandom({
      network,
    });
    const keyPair = ECPair.fromWIF(ecpair.toWIF(), network);

    const pubkey = keyPair.publicKey;

    const tx = this.clone();
    const addressTypes: AddressType[] = [];
    tx.utxos.forEach((v) => {
      v.pubkey = bytesToHex(pubkey);
      const address = getEstimateAddress(pubkey, v.addressType);
      const scriptPk = addressToScriptPk(address);
      v.scriptPk = bytesToHex(scriptPk);
      addressTypes.push(v.addressType);
    });

    tx.inputs = [];
    tx.utxos.forEach((v) => {
      const input = utxoToInput(v, true);
      tx.inputs.push(input);
    });

    const psbt = tx.toPsbt();

    const tweakedSigner = keyPair.tweak(
      bitcoin.crypto.taggedHash("TapTweak", pubkey.slice(1))
    );

    tx.inputs.forEach((_, index) => {
      try {
        const addressType = addressTypes[index];
        if (
          addressType === AddressType.P2TR ||
          addressType === AddressType.M44_P2TR
        ) {
          psbt.signTaprootInput(index, tweakedSigner);
        } else {
          psbt.signInput(index, keyPair);
        }
        psbt.finalizeInput(index);
      } catch (err) {
        console.log(err);
      }
    });

    return psbt;
  }

  private selectBtcUtxos() {
    const totalInput = this.getTotalInput();

    const totalOutput =
      this.getTotalOutput() + BigInt(Math.ceil(this._cacheNetworkFee));
    if (totalInput < totalOutput) {
      const { selectedUtxos, remainingUtxos } = selectBtcUtxos(
        this._cacheBtcUtxos,
        totalOutput - totalInput
      );
      if (selectedUtxos.length == 0) {
        throw new Error("INSUFFICIENT_BTC_UTXO");
      }
      selectedUtxos.forEach((v) => {
        this.addInput(v);
        this._cacheToSignInputs.push({
          index: this.inputs.length - 1,
          publicKey: v.pubkey,
        });
        this._cacheNetworkFee +=
          getAddedVirtualSize(v.addressType) * this.feeRate;
      });
      this._cacheBtcUtxos = remainingUtxos;
      this.selectBtcUtxos();
    }
  }

  addSufficientUtxosForFee(btcUtxos: UnspentOutput[], forceAsFee?: boolean) {
    if (btcUtxos.length > 0) {
      this._cacheBtcUtxos = btcUtxos;
      const dummyBtcUtxo = Object.assign({}, btcUtxos[0]);
      dummyBtcUtxo.satoshis = BigInt(2100000000000000);
      this.addInput(dummyBtcUtxo);
      this.addChangeOutput(BigInt(0));

      const networkFee = this.calNetworkFee();
      const dummyBtcUtxoSize = getAddedVirtualSize(dummyBtcUtxo.addressType);
      this._cacheNetworkFee = networkFee - dummyBtcUtxoSize * this.feeRate;

      this.removeLastInput();

      this.selectBtcUtxos();
    } else {
      if (forceAsFee) {
        throw new Error("INSUFFICIENT_BTC_UTXO");
      }
      if (this.getTotalInput() < this.getTotalOutput()) {
        throw new Error("INSUFFICIENT_BTC_UTXO");
      }
      this._cacheNetworkFee = this.calNetworkFee();
    }

    const changeAmount =
      this.getTotalInput() -
      this.getTotalOutput() -
      BigInt(Math.ceil(this._cacheNetworkFee));
    if (changeAmount > UTXO_DUST) {
      this.removeChangeOutput();
      this.addChangeOutput(changeAmount);
    } else {
      this.removeChangeOutput();
    }

    return this._cacheToSignInputs;
  }
}
