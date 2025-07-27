import { clsx, type ClassValue } from "clsx";
import * as bitcoin from "bitcoinjs-lib";
import { BITCOIN, NETWORK } from "../constants";
import * as ecc from "@bitcoinerlab/secp256k1";
import { AddressType, Coin, UnspentOutput } from "../types";
import Decimal from "decimal.js";
import { toPsbtNetwork } from "./network";
import { Utxo } from "../canister/cookie/service.did";
import { twMerge } from 'tailwind-merge'

bitcoin.initEccLib(ecc);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ellipseMiddle(
  target: string | null,
  charsStart = 5,
  charsEnd = 5
): string {
  if (!target) {
    return "";
  }
  return `${target.slice(0, charsStart)}...${target.slice(
    target.length - charsEnd
  )}`;
}

export function bytesToHex(bytes: Uint8Array) {
  const hexes = Array.from({ length: 256 }, (_, i) =>
    i.toString(16).padStart(2, "0")
  );
  let hex = "";
  for (const byte of bytes) {
		hex += hexes[byte]
	}
  return hex;
}

export function hexToBytes(hex: string) {
  const cleanHex = hex.replace(/^0x/, "").replace(/\s/g, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error(`Invalid hex string length: ${cleanHex.length}`);
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(cleanHex.substr(i * 2, 2), 16);
    if (isNaN(byte)) {
      throw new Error(`Invalid hex string at position ${i * 2}`);
    }
    bytes[i] = byte;
  }
  return bytes;
}

export function getP2trAressAndScript(pubkey: string) {
  const { address, output } = bitcoin.payments.p2tr({
    internalPubkey: hexToBytes(pubkey),
    network: toPsbtNetwork(NETWORK),
  });

  return { address, output: output ? bytesToHex(output) : "" };
}

export function getCoinSymbol(coin: Coin | null | undefined) {
  return coin ? (coin.id === BITCOIN.id ? coin.symbol! : coin.name) : "";
}

export function getCoinName(coin: Coin | null | undefined) {
  return coin ? (coin.id === BITCOIN.id ? coin.name : coin.id) : "";
}

export function getRunePriceInSats(btcAmount: string, runeAmount: string) {
  return Number(btcAmount) && Number(runeAmount)
    ? new Decimal(btcAmount).mul(Math.pow(10, 8)).div(runeAmount).toFixed(3)
    : undefined;
}

export function isNumber(value: string) {
  const reg = /^[0-9]+\.?[0-9]*$/;
  return reg.test(value);
}

export function convertUtxo(utxo: Utxo, untweaked_key: string ): UnspentOutput {
  const { address: poolAddress, output } = getP2trAressAndScript(untweaked_key);
  return {
    txid: utxo.txid,
    vout: utxo.vout,
    satoshis: utxo.sats,
    scriptPk: output,
    pubkey: "",
    addressType: AddressType.P2TR,
    address: poolAddress!,
    // runes: {
    //   id: utxo.maybe_rune;
    //   amount: string;
    // }[];
    runes: utxo.coins
		.filter(e=>e.id!==BITCOIN.id)
		.map(rune => ({
			id: rune.id,
			amount: rune.value.toString()
		}))
  }
}