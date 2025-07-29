import { AddressType, Coin, TransactionInfo, UnspentOutput, TransactionType } from "../../types";

import { getCoinSymbol } from "../common";
import { } from "../../types";
import { getTxInfo, getRawTx } from "../chain-api";
import { getAddressType } from "../address";
import { formatNumber } from "../format-number";
// import { Edict, Runestone } from "utils/runelib";
import { Edict, Runestone } from "runelib";

export async function getTxScript(outpoint: string) {
  const [txid, vout] = outpoint.split(":");
  const voutNumber = Number(vout);
  const { vout: outputs } = await getTxInfo(txid!);

  const { scriptpubkey, scriptpubkey_address } = outputs[voutNumber];
  return {
    scriptPk: scriptpubkey,
    address: scriptpubkey_address,
  };
}

export async function getUtxoByOutpoint(
  txid: string,
  vout: number
): Promise<UnspentOutput | undefined> {
  const voutNumber = Number(vout);

  const [{ vout: outputs }, rawTx] = (await Promise.all([
    getTxInfo(txid),
    getRawTx(txid),
  ])) as [
    {
      vout: {
        scriptpubkey: string;
        scriptpubkey_address: string;
        scriptpubkey_asm: string;
        scriptpubkey_type: string;
        value: number;
      }[];
      status: { confirmed: boolean; block_height: number };
    },
    string
  ];

  if (!outputs) {
    return;
  }

  const { scriptpubkey, scriptpubkey_address, value } = outputs[voutNumber]!;

  const opReturn = outputs.find(
    ({ scriptpubkey_type }) => scriptpubkey_type === "op_return"
  );

  let edicts: Edict[] = [];
  if (opReturn) {
    const stone = Runestone.decipher(rawTx);

    if (stone.isSome()) {
      const value = stone.value();
      edicts = value?.edicts || [];
    }
  }

  const edict = edicts.find((e) => e.output === voutNumber);

  return {
    txid,
    vout: voutNumber,
    satoshis: BigInt(value),
    scriptPk: scriptpubkey,
    address: scriptpubkey_address,
    pubkey: "",
    addressType: getAddressType(scriptpubkey_address),
    runes: edict
      ? [
          {
            id: `${edict.id.block}:${edict.id.idx}`,
            amount: edict.amount.toString(),
          },
        ]
      : [],
  };
}

export function selectBtcUtxos(utxos: UnspentOutput[], targetAmount: bigint) {
  const selectedUtxos: UnspentOutput[] = [];
  const remainingUtxos: UnspentOutput[] = [];

  let totalAmount = BigInt(0);
  for (const utxo of utxos) {
    if (utxo.runes.length) {
      continue;
    }
    if (totalAmount < targetAmount) {
      totalAmount += BigInt(utxo.satoshis);
      selectedUtxos.push(utxo);
    } else {
      remainingUtxos.push(utxo);
    }
  }

  return {
    selectedUtxos,
    remainingUtxos,
  };
}

export function selectRuneUtxos(
  utxos: UnspentOutput[],
  coin: Coin,
  targetAmount: bigint
) {
  const selectedUtxos: UnspentOutput[] = [];
  const remainingUtxos: UnspentOutput[] = [];

  let totalAmount = BigInt(0);
  for (const utxo of utxos) {
    if (!utxo.runes.length) {
      continue;
    }
    const containsTargetCoinUtxoIdx = utxo.runes.findIndex(
      (rune) => rune.id === coin.id
    );

    if (containsTargetCoinUtxoIdx < 0) {
      continue;
    }

    if (totalAmount < targetAmount) {
      totalAmount += BigInt(utxo.runes[containsTargetCoinUtxoIdx]!.amount);
      if (
        selectedUtxos.findIndex(
          (item) => item.txid === utxo.txid && item.vout === utxo.vout
        ) < 0
      ) {
        selectedUtxos.push(utxo);
      }
    } else {
      remainingUtxos.push(utxo);
    }
  }

  return {
    selectedUtxos,
    remainingUtxos,
  };
}

export function getAddedVirtualSize(addressType: AddressType) {
  if (
    addressType === AddressType.P2WPKH ||
    addressType === AddressType.M44_P2WPKH
  ) {
    return 41 + (1 + 1 + 72 + 1 + 33) / 4;
  } else if (
    addressType === AddressType.P2TR ||
    addressType === AddressType.M44_P2TR
  ) {
    return 41 + (1 + 1 + 64) / 4;
  } else if (addressType === AddressType.P2PKH) {
    return 41 + 1 + 1 + 72 + 1 + 33;
  } else if (addressType === AddressType.P2SH_P2WPKH) {
    return 41 + 24 + (1 + 1 + 72 + 1 + 33) / 4;
  }
  throw new Error("unknown address type");
}

export function getTxTitleAndDescription(transaction: TransactionInfo): {
  title: string;
  description: string;
} {
  const { type, coinA, coinB, coinAAmount, coinBAmount } = transaction;
  let title = "",
    description = "";
  if (type === TransactionType.ADD_LIQUIDITY) {
    title = `Add Liquidity to ${getCoinSymbol(coinB)} pool`;
    description = `Deposit ${formatNumber(coinAAmount)} ${getCoinSymbol(
      coinA
    )} and ${formatNumber(coinBAmount)} ${getCoinSymbol(
      coinB
    )} to ${getCoinSymbol(coinB)} pool`;
  } else if (type === TransactionType.SWAP) {
    title = `Swap ${getCoinSymbol(coinA)} to ${getCoinSymbol(coinB)}`;
    description = `Convert ${formatNumber(coinAAmount)} ${getCoinSymbol(
      coinA
    )} to ${formatNumber(coinBAmount)} ${getCoinSymbol(coinB)}`;
  } else if (type === TransactionType.WITHDRAW_LIQUIDITY) {
    title = `Withdraw Liquidity from ${getCoinSymbol(coinB)} pool`;
    description = `Widthdraw ${formatNumber(coinAAmount)} ${getCoinSymbol(
      coinA
    )} and ${formatNumber(coinBAmount)} ${getCoinSymbol(
      coinB
    )} from ${getCoinSymbol(coinB)} pool`;
  }

  return {
    title,
    description,
  };
}
