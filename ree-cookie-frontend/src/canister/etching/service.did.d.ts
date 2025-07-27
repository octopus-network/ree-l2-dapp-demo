import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type BitcoinNetwork = { 'mainnet' : null } |
  { 'regtest' : null } |
  { 'testnet' : null };
export interface EtchingAccountInfo {
  'derive_path' : string,
  'pubkey' : string,
  'address' : string,
}
export interface EtchingArgs {
  'terms' : [] | [OrdinalsTerms],
  'turbo' : boolean,
  'premine' : [] | [bigint],
  'logo' : [] | [LogoParams],
  'rune_name' : string,
  'divisibility' : [] | [number],
  'premine_receiver' : string,
  'symbol' : [] | [string],
}
export interface EtchingStateArgs {
  'ecdsa_key_name' : string,
  'runes_indexer' : Principal,
  'etching_fee' : [] | [bigint],
  'btc_network' : BitcoinNetwork,
  'mpc_principal' : Principal,
}
export type EtchingStatus = { 'SendRevealSuccess' : null } |
  { 'SendRevealFailed' : null } |
  { 'SendCommitFailed' : null } |
  { 'SendCommitSuccess' : null } |
  { 'Final' : null } |
  { 'Initial' : null };
export type EtchingUpgradeArgs = { 'Upgrade' : [] | [EtchingStateArgs] } |
  { 'Init' : EtchingStateArgs };
export interface LogoParams {
  'content_type' : string,
  'content_base64' : string,
}
export interface OrdinalsTerms {
  'cap' : bigint,
  'height' : [[] | [bigint], [] | [bigint]],
  'offset' : [[] | [bigint], [] | [bigint]],
  'amount' : bigint,
}
export type Result = { 'Ok' : string } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : null } |
  { 'Err' : string };
export interface SendEtchingInfo {
  'status' : EtchingStatus,
  'script_out_address' : string,
  'err_info' : string,
  'commit_txid' : string,
  'time_at' : bigint,
  'etching_args' : EtchingArgs,
  'receiver' : string,
  'reveal_txid' : string,
}
export interface SetTxFeePerVbyteArgs {
  'low' : bigint,
  'high' : bigint,
  'medium' : bigint,
}
export interface UtxoArgs { 'id' : string, 'index' : number, 'amount' : bigint }
export interface _SERVICE {
  'etching' : ActorMethod<[EtchingArgs], Result>,
  'etching_fee_utxos' : ActorMethod<[], Array<UtxoArgs>>,
  'etching_reveal' : ActorMethod<[string], undefined>,
  'get_etching_request' : ActorMethod<[string], [] | [SendEtchingInfo]>,
  'init_etching_sender_account' : ActorMethod<[], EtchingAccountInfo>,
  'query_etching_canister_by_runes' : ActorMethod<[string], [] | [Principal]>,
  'query_etching_fee' : ActorMethod<[], bigint>,
  'set_etching_fee' : ActorMethod<[bigint], undefined>,
  'set_etching_fee_utxos' : ActorMethod<[Array<UtxoArgs>], undefined>,
  'set_tx_fee_per_vbyte' : ActorMethod<[SetTxFeePerVbyteArgs], Result_1>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
