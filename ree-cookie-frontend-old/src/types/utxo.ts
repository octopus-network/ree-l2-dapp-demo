export interface UnspentOutput {
  txid: string;
  vout: number;
  satoshis: bigint;
  scriptPk: string;
  pubkey: string;
  addressType: AddressType;
  address: string;
  runes: {
    id: string;
    amount: string;
  }[];
  rawtx?: string;
}

export enum AddressType {
  P2PKH,
  P2WPKH,
  P2TR,
  P2SH_P2WPKH,
  M44_P2WPKH, // deprecated
  M44_P2TR, // deprecated
  P2WSH,
  P2SH,
  UNKNOWN,
}
