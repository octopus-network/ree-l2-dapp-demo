export const idlFactory = ({ IDL }) => {
  const InitArgs = IDL.Record({
    'rune_indexer' : IDL.Principal,
    'magiceden_api_key' : IDL.Text,
    'fee_collector' : IDL.Text,
    'orchestrator' : IDL.Principal,
    'btc_network' : IDL.Text,
    'schnorr_key_name' : IDL.Text,
    'ordi_scan_api_key' : IDL.Text,
  });
  const Lifecycle = IDL.Variant({
    'Upgrade' : IDL.Opt(IDL.Record({})),
    'Init' : InitArgs,
  });
  const CreatePoolArgs = IDL.Record({
    'nft_collection' : IDL.Text,
    'pool_utxo' : IDL.Text,
    'collection_name' : IDL.Text,
    'rune_id' : IDL.Text,
  });
  const ExchangeError = IDL.Variant({
    'InvalidExecuteTxArgs' : IDL.Text,
    'AuctionHasNotEnded' : IDL.Null,
    'RpcError' : IDL.Text,
    'InvalidCollection' : IDL.Null,
    'AuctionHasSettled' : IDL.Null,
    'AuctionHasEnded' : IDL.Null,
    'InvalidDepositId' : IDL.Null,
    'PoolStateExpired' : IDL.Nat64,
    'Custom' : IDL.Text,
    'InsufficientRunesToken' : IDL.Null,
    'InvalidPool' : IDL.Null,
    'BidTooLow' : IDL.Nat,
    'PoolAlreadyExist' : IDL.Null,
    'InvalidState' : IDL.Text,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : ExchangeError });
  const CoinBalance = IDL.Record({ 'id' : IDL.Text, 'value' : IDL.Nat });
  const InputCoin = IDL.Record({ 'coin' : CoinBalance, 'from' : IDL.Text });
  const OutputCoin = IDL.Record({ 'to' : IDL.Text, 'coin' : CoinBalance });
  const Utxo = IDL.Record({
    'coins' : IDL.Vec(CoinBalance),
    'sats' : IDL.Nat64,
    'txid' : IDL.Text,
    'vout' : IDL.Nat32,
  });
  const Intention = IDL.Record({
    'input_coins' : IDL.Vec(InputCoin),
    'output_coins' : IDL.Vec(OutputCoin),
    'action' : IDL.Text,
    'exchange_id' : IDL.Text,
    'pool_utxo_spent' : IDL.Vec(IDL.Text),
    'action_params' : IDL.Text,
    'nonce' : IDL.Nat64,
    'pool_address' : IDL.Text,
    'pool_utxo_received' : IDL.Vec(Utxo),
  });
  const IntentionSet = IDL.Record({
    'tx_fee_in_sats' : IDL.Nat64,
    'initiator_address' : IDL.Text,
    'intentions' : IDL.Vec(Intention),
  });
  const ExecuteTxArgs = IDL.Record({
    'zero_confirmed_tx_queue_length' : IDL.Nat32,
    'txid' : IDL.Text,
    'intention_set' : IntentionSet,
    'intention_index' : IDL.Nat32,
    'psbt_hex' : IDL.Text,
  });
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const ExchangeCfg = IDL.Record({
    'depositor_share' : IDL.Nat32,
    'rune_offering' : IDL.Nat,
    'starting_bid' : IDL.Nat,
    'auction_duration' : IDL.Nat64,
    'extension_triger_time' : IDL.Nat64,
    'fee_collector' : IDL.Text,
    'bid_increment' : IDL.Nat,
    'fee_collector_share' : IDL.Nat32,
    'bid_extension_time' : IDL.Nat64,
  });
  const NftStatus = IDL.Variant({
    'PreAuction' : IDL.Null,
    'EndAuction' : IDL.Null,
    'Reclaimed' : IDL.Null,
    'UnderAuction' : IDL.Null,
    'Settled' : IDL.Null,
  });
  const GetNftsArg = IDL.Record({
    'status' : IDL.Opt(NftStatus),
    'depositor' : IDL.Opt(IDL.Text),
    'start' : IDL.Opt(IDL.Nat64),
    'length' : IDL.Opt(IDL.Nat64),
    'pool_address' : IDL.Opt(IDL.Text),
    'bidder' : IDL.Opt(IDL.Text),
  });
  const Bidder = IDL.Record({
    'claimed' : IDL.Bool,
    'address' : IDL.Text,
    'amount' : IDL.Nat,
  });
  const Auction = IDL.Record({
    'settled' : IDL.Bool,
    'end_time' : IDL.Nat64,
    'bidders' : IDL.Vec(IDL.Tuple(IDL.Text, Bidder)),
    'top_bidder' : IDL.Text,
  });
  const OrdinalsNFT = IDL.Record({
    'depositor' : IDL.Text,
    'deposit_time' : IDL.Nat64,
    'inscription_id' : IDL.Text,
    'locked_utxo' : Utxo,
    'auction' : IDL.Opt(Auction),
    'reclaimed' : IDL.Bool,
  });
  const GetNftsResp = IDL.Record({
    'nft' : OrdinalsNFT,
    'status' : NftStatus,
    'deposit_id' : IDL.Text,
    'pool_address' : IDL.Text,
  });
  const Result_2 = IDL.Variant({
    'Ok' : IDL.Vec(GetNftsResp),
    'Err' : ExchangeError,
  });
  const GetPoolInfoArgs = IDL.Record({ 'pool_address' : IDL.Text });
  const PoolInfo = IDL.Record({
    'key' : IDL.Text,
    'name' : IDL.Text,
    'btc_reserved' : IDL.Nat64,
    'key_derivation_path' : IDL.Vec(IDL.Vec(IDL.Nat8)),
    'coin_reserved' : IDL.Vec(CoinBalance),
    'attributes' : IDL.Text,
    'address' : IDL.Text,
    'nonce' : IDL.Nat64,
    'utxos' : IDL.Vec(Utxo),
  });
  const PoolBasic = IDL.Record({ 'name' : IDL.Text, 'address' : IDL.Text });
  const PoolState = IDL.Record({
    'id' : IDL.Text,
    'deposit_nfts' : IDL.Vec(IDL.Tuple(IDL.Text, OrdinalsNFT)),
    'utxo' : Utxo,
    'nonce' : IDL.Nat64,
  });
  const NewBlockInfo = IDL.Record({
    'block_hash' : IDL.Text,
    'confirmed_txids' : IDL.Vec(IDL.Text),
    'block_timestamp' : IDL.Nat64,
    'block_height' : IDL.Nat32,
  });
  const Result_3 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const RollbackTxArgs = IDL.Record({ 'txid' : IDL.Text });
  return IDL.Service({
    'create_pool' : IDL.Func([CreatePoolArgs], [Result], []),
    'execute_tx' : IDL.Func([ExecuteTxArgs], [Result_1], []),
    'get_config' : IDL.Func([], [ExchangeCfg], ['query']),
    'get_nfts' : IDL.Func([GetNftsArg], [Result_2], ['query']),
    'get_pool_address' : IDL.Func([IDL.Text], [Result_1], []),
    'get_pool_info' : IDL.Func(
        [GetPoolInfoArgs],
        [IDL.Opt(PoolInfo)],
        ['query'],
      ),
    'get_pool_list' : IDL.Func([], [IDL.Vec(PoolBasic)], ['query']),
    'get_states' : IDL.Func([], [IDL.Vec(PoolState)], ['query']),
    'new_block' : IDL.Func([NewBlockInfo], [Result_3], []),
    'rollback_tx' : IDL.Func([RollbackTxArgs], [Result_3], []),
  });
};
export const init = ({ IDL }) => {
  const InitArgs = IDL.Record({
    'rune_indexer' : IDL.Principal,
    'magiceden_api_key' : IDL.Text,
    'fee_collector' : IDL.Text,
    'orchestrator' : IDL.Principal,
    'btc_network' : IDL.Text,
    'schnorr_key_name' : IDL.Text,
    'ordi_scan_api_key' : IDL.Text,
  });
  const Lifecycle = IDL.Variant({
    'Upgrade' : IDL.Opt(IDL.Record({})),
    'Init' : InitArgs,
  });
  return [Lifecycle];
};
