import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Auction {
  'settled' : boolean,
  'end_time' : bigint,
  'bidders' : Array<[string, Bidder]>,
  'top_bidder' : string,
}
export interface Bidder {
  'claimed' : boolean,
  'address' : string,
  'amount' : bigint,
}
export interface CoinBalance { 'id' : string, 'value' : bigint }
export interface CreatePoolArgs {
  'nft_collection' : string,
  'pool_utxo' : string,
  'collection_name' : string,
  'rune_id' : string,
}
export interface ExchangeCfg {
  'depositor_share' : number,
  'rune_offering' : bigint,
  'starting_bid' : bigint,
  'auction_duration' : bigint,
  'extension_triger_time' : bigint,
  'fee_collector' : string,
  'bid_increment' : bigint,
  'fee_collector_share' : number,
  'bid_extension_time' : bigint,
}
export type ExchangeError = { 'InvalidExecuteTxArgs' : string } |
  { 'AuctionHasNotEnded' : null } |
  { 'RpcError' : string } |
  { 'InvalidCollection' : null } |
  { 'AuctionHasSettled' : null } |
  { 'AuctionHasEnded' : null } |
  { 'InvalidDepositId' : null } |
  { 'PoolStateExpired' : bigint } |
  { 'Custom' : string } |
  { 'InsufficientRunesToken' : null } |
  { 'InvalidPool' : null } |
  { 'BidTooLow' : bigint } |
  { 'PoolAlreadyExist' : null } |
  { 'InvalidState' : string };
export interface ExecuteTxArgs {
  'zero_confirmed_tx_queue_length' : number,
  'txid' : string,
  'intention_set' : IntentionSet,
  'intention_index' : number,
  'psbt_hex' : string,
}
export interface GetNftsArg {
  'status' : [] | [NftStatus],
  'depositor' : [] | [string],
  'start' : [] | [bigint],
  'length' : [] | [bigint],
  'pool_address' : [] | [string],
  'bidder' : [] | [string],
}
export interface GetNftsResp {
  'nft' : OrdinalsNFT,
  'status' : NftStatus,
  'deposit_id' : string,
  'pool_address' : string,
}
export interface GetPoolInfoArgs { 'pool_address' : string }
export interface InitArgs {
  'rune_indexer' : Principal,
  'magiceden_api_key' : string,
  'fee_collector' : string,
  'orchestrator' : Principal,
  'btc_network' : string,
  'schnorr_key_name' : string,
  'ordi_scan_api_key' : string,
}
export interface InputCoin { 'coin' : CoinBalance, 'from' : string }
export interface Intention {
  'input_coins' : Array<InputCoin>,
  'output_coins' : Array<OutputCoin>,
  'action' : string,
  'exchange_id' : string,
  'pool_utxo_spent' : Array<string>,
  'action_params' : string,
  'nonce' : bigint,
  'pool_address' : string,
  'pool_utxo_received' : Array<Utxo>,
}
export interface IntentionSet {
  'tx_fee_in_sats' : bigint,
  'initiator_address' : string,
  'intentions' : Array<Intention>,
}
export type Lifecycle = { 'Upgrade' : [] | [{}] } |
  { 'Init' : InitArgs };
export interface NewBlockInfo {
  'block_hash' : string,
  'confirmed_txids' : Array<string>,
  'block_timestamp' : bigint,
  'block_height' : number,
}
export type NftStatus = { 'PreAuction' : null } |
  { 'EndAuction' : null } |
  { 'Reclaimed' : null } |
  { 'UnderAuction' : null } |
  { 'Settled' : null };
export interface OrdinalsNFT {
  'depositor' : string,
  'deposit_time' : bigint,
  'inscription_id' : string,
  'locked_utxo' : Utxo,
  'auction' : [] | [Auction],
  'reclaimed' : boolean,
}
export interface OutputCoin { 'to' : string, 'coin' : CoinBalance }
export interface PoolBasic { 'name' : string, 'address' : string }
export interface PoolInfo {
  'key' : string,
  'name' : string,
  'btc_reserved' : bigint,
  'key_derivation_path' : Array<Uint8Array | number[]>,
  'coin_reserved' : Array<CoinBalance>,
  'attributes' : string,
  'address' : string,
  'nonce' : bigint,
  'utxos' : Array<Utxo>,
}
export interface PoolState {
  'id' : string,
  'deposit_nfts' : Array<[string, OrdinalsNFT]>,
  'utxo' : Utxo,
  'nonce' : bigint,
}
export type Result = { 'Ok' : string } |
  { 'Err' : ExchangeError };
export type Result_1 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : Array<GetNftsResp> } |
  { 'Err' : ExchangeError };
export type Result_3 = { 'Ok' : null } |
  { 'Err' : string };
export interface RollbackTxArgs { 'txid' : string }
export interface Utxo {
  'coins' : Array<CoinBalance>,
  'sats' : bigint,
  'txid' : string,
  'vout' : number,
}
export interface _SERVICE {
  'create_pool' : ActorMethod<[CreatePoolArgs], Result>,
  'execute_tx' : ActorMethod<[ExecuteTxArgs], Result_1>,
  'get_config' : ActorMethod<[], ExchangeCfg>,
  'get_nfts' : ActorMethod<[GetNftsArg], Result_2>,
  'get_pool_address' : ActorMethod<[string], Result_1>,
  'get_pool_info' : ActorMethod<[GetPoolInfoArgs], [] | [PoolInfo]>,
  'get_pool_list' : ActorMethod<[], Array<PoolBasic>>,
  'get_states' : ActorMethod<[], Array<PoolState>>,
  'new_block' : ActorMethod<[NewBlockInfo], Result_3>,
  'rollback_tx' : ActorMethod<[RollbackTxArgs], Result_3>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
