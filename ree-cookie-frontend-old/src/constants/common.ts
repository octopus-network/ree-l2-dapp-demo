import { NetworkType } from "@omnisat/lasereyes";

export const UTXO_DUST = BigInt(546);
export const ICP_HOST = "https://icp-api.io";
export const COOKIE_EXCHANGE_ID = "ree_cookie";
export const RICHSWAP_EXCHANGE_ID = "RICH_SWAP";

export const NETWORK = (import.meta.env.NEXT_PUBLIC_NETWORK ??
  "testnet4") as NetworkType;

export const MEMPOOL_URL =
import.meta.env.NEXT_PUBLIC_MEMPOOL_URL ?? "https://mempool.space";
