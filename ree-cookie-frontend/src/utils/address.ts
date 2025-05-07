import * as bitcoin from "bitcoinjs-lib";
import { AddressType, TxOutputType } from "../types";
import { toPsbtNetwork } from "./network";

import { NETWORK } from "../constants";

export function addressToScriptPk(address: string) {
  const network = toPsbtNetwork(NETWORK);
  return bitcoin.address.toOutputScript(address, network);
}

export function getEstimateAddress(
  pubkey: Uint8Array,
  addressType: AddressType
) {
  const network = toPsbtNetwork(NETWORK);

  const defaultAddress =
    "bc1py6wpspaygpcgzts8se00cufvrz0acf3yklxc7gx3trj0wxag8n5sm2ysdc";

  if (addressType === AddressType.P2PKH) {
    const { address } = bitcoin.payments.p2pkh({
      pubkey,
      network,
    });
    return address ?? defaultAddress;
  } else if (
    addressType === AddressType.P2SH_P2WPKH ||
    addressType === AddressType.P2WPKH
  ) {
    const { address } = bitcoin.payments.p2wpkh({
      pubkey,
      network,
    });
    return address ?? defaultAddress;
  } else if (addressType === AddressType.P2TR) {
    const { address } = bitcoin.payments.p2tr({
      internalPubkey: pubkey.slice(1),
      network,
    });

    return address ?? defaultAddress;
  }

  return defaultAddress;
}

export function decodeAddress(address: string) {
  const mainnet = bitcoin.networks.bitcoin;
  const testnet = bitcoin.networks.testnet;
  const regtest = bitcoin.networks.regtest;
  let decodeBase58: bitcoin.address.Base58CheckResult;
  let decodeBech32: bitcoin.address.Bech32Result;

  let addressType: AddressType;
  if (
    address.startsWith("bc1") ||
    address.startsWith("tb1") ||
    address.startsWith("bcrt1")
  ) {
    try {
      decodeBech32 = bitcoin.address.fromBech32(address);

      if (decodeBech32.version === 0) {
        if (decodeBech32.data.length === 20) {
          addressType = AddressType.P2WPKH;
        } else {
          addressType = AddressType.P2WSH;
        }
      } else {
        addressType = AddressType.P2TR;
      }
      return {
        addressType,
      };
    } catch {}
  } else {
    try {
      decodeBase58 = bitcoin.address.fromBase58Check(address);
      if (decodeBase58.version === mainnet.pubKeyHash) {
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === testnet.pubKeyHash) {
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === regtest.pubKeyHash) {
        // do not work

        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === mainnet.scriptHash) {
        addressType = AddressType.P2SH_P2WPKH;
      } else if (decodeBase58.version === testnet.scriptHash) {
        addressType = AddressType.P2SH_P2WPKH;
      } else {
        // do not work

        addressType = AddressType.P2SH_P2WPKH;
      }
      return {
        addressType,
      };
    } catch {}
  }

  return {
    addressType: AddressType.UNKNOWN,
    dust: 546,
  };
}

export function getAddressType(address: string): AddressType {
  return decodeAddress(address).addressType;
}

export function addressTypeToString(addressType: AddressType): TxOutputType {
  if (addressType === AddressType.P2WPKH) {
    return { P2WPKH: null };
  } else if (addressType === AddressType.P2SH_P2WPKH) {
    return { P2SH: null };
  } else {
    return { P2TR: null };
  }
}
