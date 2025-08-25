import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type BitcoinNetwork = { 'mainnet' : null } |
  { 'regtest' : null } |
  { 'testnet' : null };
export interface BlockBasic { 'block_hash' : string, 'block_height' : number }
export interface CanisterChange {
  'timestamp_nanos' : bigint,
  'canister_version' : bigint,
  'origin' : CanisterChangeOrigin,
  'details' : CanisterChangeDetails,
}
export type CanisterChangeDetails = { 'creation' : CreationRecord } |
  { 'code_deployment' : CodeDeploymentRecord } |
  { 'load_snapshot' : LoadSnapshotRecord } |
  { 'controllers_change' : CreationRecord } |
  { 'code_uninstall' : null };
export type CanisterChangeOrigin = { 'from_user' : FromUserRecord } |
  { 'from_canister' : FromCanisterRecord };
export interface CanisterInfoResponse {
  'controllers' : Array<Principal>,
  'module_hash' : [] | [Uint8Array | number[]],
  'recent_changes' : Array<CanisterChange>,
  'total_num_changes' : bigint,
}
export type CodeDeploymentMode = { 'reinstall' : null } |
  { 'upgrade' : null } |
  { 'install' : null };
export interface CodeDeploymentRecord {
  'mode' : CodeDeploymentMode,
  'module_hash' : Uint8Array | number[],
}
export interface CoinBalance { 'id' : string, 'value' : bigint }
export interface CreationRecord { 'controllers' : Array<Principal> }
export type DeployArgs = { 'Upgrade' : null } |
  { 'Init' : null };
export interface EstimateMinTxFeeArgs {
  'input_types' : Array<TxOutputType>,
  'pool_address' : Array<string>,
  'output_types' : Array<TxOutputType>,
}
export interface ExchangePool {
  'exchange_id' : string,
  'pool_address' : string,
  'pool_key' : string,
}
export type ExchangeStatus = { 'Active' : null } |
  { 'Halted' : { 'reason' : string } };
export interface ExchangeView {
  'status' : ExchangeStatus,
  'exchange_id' : string,
  'canister_id' : Principal,
  'client_canisters' : Array<Principal>,
}
export interface ExecutionStepLogView {
  'result' : Result_3,
  'exchange_id' : string,
  'maybe_return_time' : [] | [string],
  'calling_method' : string,
  'calling_args' : string,
  'pool_address' : string,
  'calling_time' : string,
}
export interface FromCanisterRecord {
  'canister_version' : [] | [bigint],
  'canister_id' : Principal,
}
export interface FromUserRecord { 'user_id' : Principal }
export type GetFailedInvokeLogArgs = { 'All' : null } |
  { 'ByTxid' : string } |
  { 'ByAddress' : string } |
  { 'BySecondsPassed' : bigint };
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
export interface InvokeArgs {
  'intention_set' : IntentionSet,
  'initiator_utxo_proof' : Uint8Array | number[],
  'psbt_hex' : string,
}
export interface InvokeLogView {
  'rollback_results' : Array<string>,
  'invoke_args' : string,
  'invoke_time' : string,
  'finalized_time' : [] | [string],
  'confirmed_time' : [] | [string],
  'execution_steps' : Array<ExecutionStepLogView>,
  'processing_result' : Result_3,
  'broadcasted_time' : [] | [string],
}
export interface LoadSnapshotRecord {
  'canister_version' : bigint,
  'taken_at_timestamp' : bigint,
  'snapshot_id' : Uint8Array | number[],
}
export interface MempoolTxFeeRateView {
  'low' : bigint,
  'high' : bigint,
  'update_time' : string,
  'medium' : bigint,
}
export interface NewBlockDetectedArgs {
  'block_hash' : string,
  'block_timestamp' : bigint,
  'tx_ids' : Array<string>,
  'block_height' : number,
}
export interface OrchestratorSettings {
  'exchange_registry_principal' : Principal,
  'max_input_count_of_psbt' : number,
  'min_tx_confirmations' : number,
  'mempool_connector_principal' : Principal,
  'max_unconfirmed_tx_count_in_pool' : number,
  'min_btc_amount_for_utxo' : bigint,
  'rune_indexer_principal' : Principal,
  'max_intentions_per_invoke' : number,
  'max_received_blocks_count' : number,
  'bitcoin_network' : BitcoinNetwork,
}
export interface OrchestratorStatus {
  'last_block' : [] | [BlockBasic],
  'pending_tx_count' : bigint,
  'mempool_tx_fee_rate' : MempoolTxFeeRateView,
  'invoke_paused' : boolean,
}
export interface OutpointWithValue {
  'maybe_rune' : [] | [CoinBalance],
  'value' : bigint,
  'script_pubkey_hex' : string,
  'outpoint' : string,
}
export interface OutputCoin { 'to' : string, 'coin' : CoinBalance }
export interface ReceivedBlockView {
  'processing_results' : Array<string>,
  'block_basic' : BlockBasic,
  'txids' : Array<string>,
  'block_time' : string,
  'received_time' : string,
}
export interface RegisterExchangeArgs {
  'exchange_canister' : Principal,
  'exchange_id' : string,
  'client_canisters' : Array<Principal>,
}
export interface RejectedTxView {
  'rollback_results' : Array<string>,
  'txid' : string,
  'received_time' : string,
  'reason' : string,
}
export type Result = { 'Ok' : null } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : CanisterInfoResponse } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : Array<string> } |
  { 'Err' : string };
export interface SaveIncludedBlockForTxArgs {
  'txid' : string,
  'timestamp' : bigint,
  'block' : BlockBasic,
}
export interface SetTxFeePerVbyteArgs {
  'low' : bigint,
  'high' : bigint,
  'medium' : bigint,
}
export interface TxDetailView {
  'status' : [] | [TxStatus],
  'invoke_log' : InvokeLogView,
  'included_block' : [] | [BlockBasic],
  'sent_tx_hex' : string,
}
export type TxOutputType = { 'P2WPKH' : null } |
  { 'OpReturn' : bigint } |
  { 'P2SH' : null } |
  { 'P2TR' : null };
export type TxStatus = { 'Confirmed' : number } |
  { 'Rejected' : string } |
  { 'Pending' : null };
export interface Utxo {
  'coins' : Array<CoinBalance>,
  'sats' : bigint,
  'txid' : string,
  'vout' : number,
}
export type UtxoProofVerificationStatus = { 'Enabled' : null } |
  { 'Disabled' : null } |
  { 'AllowEmpty' : null };
export interface _SERVICE {
  'clear_failed_invoke_logs' : ActorMethod<
    [[] | [bigint], Array<string>],
    Result
  >,
  'estimate_min_tx_fee' : ActorMethod<[EstimateMinTxFeeArgs], Result_1>,
  'get_canister_info' : ActorMethod<[bigint], Result_2>,
  'get_exchange_pools' : ActorMethod<[], Array<ExchangePool>>,
  'get_failed_invoke_logs' : ActorMethod<
    [GetFailedInvokeLogArgs],
    Array<[string, InvokeLogView]>
  >,
  'get_last_sent_txs' : ActorMethod<
    [[] | [number]],
    Array<[string, string, [] | [number]]>
  >,
  'get_received_blocks' : ActorMethod<
    [[] | [boolean]],
    Array<ReceivedBlockView>
  >,
  'get_registered_exchanges' : ActorMethod<[], Array<ExchangeView>>,
  'get_rejected_txs' : ActorMethod<[[] | [number]], Array<RejectedTxView>>,
  'get_settings' : ActorMethod<[], OrchestratorSettings>,
  'get_status' : ActorMethod<[], OrchestratorStatus>,
  'get_tx_for_outpoint' : ActorMethod<[string], [] | [TxDetailView]>,
  'get_tx_queue_of_pool' : ActorMethod<
    [string],
    Array<[string, [] | [number]]>
  >,
  'get_tx_sent' : ActorMethod<[string], [] | [TxDetailView]>,
  'get_used_outpoints' : ActorMethod<[[] | [string]], Array<[string, string]>>,
  'get_zero_confirmed_tx_count_of_pool' : ActorMethod<[string], number>,
  'get_zero_confirmed_txs' : ActorMethod<[[] | [string]], Array<string>>,
  'get_zero_confirmed_utxos_of_address' : ActorMethod<
    [string],
    Array<OutpointWithValue>
  >,
  'invoke' : ActorMethod<[InvokeArgs], Result_3>,
  'new_block_detected' : ActorMethod<[NewBlockDetectedArgs], Result>,
  'notify_exchange_for_blocks_from_height' : ActorMethod<
    [string, number],
    Result_4
  >,
  'register_exchange' : ActorMethod<[RegisterExchangeArgs], Result>,
  'save_included_block_for_tx' : ActorMethod<
    [SaveIncludedBlockForTxArgs],
    Result
  >,
  'set_max_input_count_of_psbt' : ActorMethod<[number], Result>,
  'set_max_intentions_per_invoke' : ActorMethod<[number], Result>,
  'set_max_received_blocks_count' : ActorMethod<[number], Result>,
  'set_max_unconfirmed_tx_count_in_pool' : ActorMethod<[number], Result>,
  'set_min_btc_amount_for_utxo' : ActorMethod<[bigint], Result>,
  'set_min_tx_confirmations' : ActorMethod<[number], Result>,
  'set_tx_fee_per_vbyte' : ActorMethod<[SetTxFeePerVbyteArgs], Result>,
  'update_bitcoin_subnet_certificate' : ActorMethod<
    [Uint8Array | number[]],
    undefined
  >,
  'version' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
