import * as bitcoin from "bitcoinjs-lib";
import { NetworkType } from "@omnisat/lasereyes";

export function toPsbtNetwork(network: NetworkType) {
  if (network === "mainnet") {
    return bitcoin.networks.bitcoin;
  } else {
    return bitcoin.networks.testnet;
  }
}
