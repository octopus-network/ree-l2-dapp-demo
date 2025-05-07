import { Coin, CoinBalance, CoinWithBalance } from "./coin";

import { UnspentOutput } from "./utxo";

export enum SwapState {
  LOADING = "loading",
  INVALID = "invalid",
  STALE = "stale",
  NO_POOL = "no_pool",
  VALID = "valid",
}

export type SwapQuote = {
  state: SwapState;
  inputAmount: string;
  nonce?: string;
  outputAmount?: string;
  errorMessage?: string;
  utxos?: UnspentOutput[];
  pool?: PoolData;
};

export enum DepositState {
  LOADING = "loading",
  INVALID = "invalid",
  EMPTY = "empty",
  VALID = "valid",
}

export type DepositQuote = {
  state: DepositState;
  inputAmount: string;
  nonce?: string;
  outputAmount?: string;
  errorMessage?: string;
  utxos?: UnspentOutput[];
};

export type PoolData = {
  key: string;
  coinAId: string;
  coinBId: string;
  coinAAmount: string;
  coinBAmount: string;
  incomes: string;
};

export type PoolInfo = {
  key: string;
  address: string;
  name: string;
  coinA: CoinWithBalance;
  coinB: CoinWithBalance;
};

export type PoolOverview = {
  key: string;
  name: string;
  btc_reserved: bigint;
  coin_reserved: CoinBalance[];
  address: string;
  nonce: bigint;
};

// # TESTNET
// export interface Position {
//   pool: PoolInfo;
//   coinA: Coin | undefined;
//   coinAAmount: string;
//   coinB: Coin | undefined;
//   coinBAmount: string;
//   totalShare: string;
//   userAddress: string;
//   userShare: string;
//   userIncomes: string;
// }

export interface Position {
  pool: PoolInfo;
  coinA: Coin | undefined;
  coinAAmount: string;
  coinB: Coin | undefined;
  coinBAmount: string;
  btcSupply: string;
  userAddress: string;
  userShare: string;
  sqrtK: string;
}