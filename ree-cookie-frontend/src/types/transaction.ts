import { Coin } from "./coin";
import { UnspentOutput } from "./utxo";

export type ToSignInput = {
  publicKey?: string;
  address?: string;
  index: number;
};

export enum TransactionStatus {
  BROADCASTED,
  CONFIRMING,
  FINALIZED,
  REJECTED,
  FAILED,
}

export enum TransactionType {
  SWAP,
  ADD_LIQUIDITY,
  WITHDRAW_LIQUIDITY,
}

export interface TransactionInfo {
  txid: string;
  type: TransactionType;
  status: TransactionStatus;
  coinA: Coin;
  coinB: Coin;
  coinAAmount: string;
  coinBAmount: string;
  poolKey: string;
  timestamp: number;
  nonce?: string;
  message?: string;
  blockHeight?: number;
  utxos?: UnspentOutput[];
}
