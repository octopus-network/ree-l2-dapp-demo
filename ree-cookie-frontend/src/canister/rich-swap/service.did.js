export const idlFactory = ({ IDL }) => {
  const ExchangeError = IDL.Variant({
    'InvalidSignPsbtArgs' : IDL.Text,
    'InvalidNumeric' : IDL.Null,
    'Overflow' : IDL.Null,
    'InvalidInput' : IDL.Null,
    'PoolAddressNotFound' : IDL.Null,
    'PoolStateExpired' : IDL.Nat64,
    'TooSmallFunds' : IDL.Null,
    'InvalidRuneId' : IDL.Null,
    'InvalidPool' : IDL.Null,
    'InvalidPsbt' : IDL.Text,
    'PoolAlreadyExists' : IDL.Null,
    'InvalidTxid' : IDL.Null,
    'InvalidLiquidity' : IDL.Null,
    'EmptyPool' : IDL.Null,
    'LpNotFound' : IDL.Null,
    'ChainKeyError' : IDL.Null,
    'FetchRuneIndexerError' : IDL.Null,
    'InvalidState' : IDL.Text,
    'InsufficientFunds' : IDL.Null,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : ExchangeError });
  const CoinBalance = IDL.Record({ 'id' : IDL.Text, 'value' : IDL.Nat });
  const InputCoin = IDL.Record({ 'coin' : CoinBalance, 'from' : IDL.Text });
  const OutputCoin = IDL.Record({ 'to' : IDL.Text, 'coin' : CoinBalance });
  const Intention = IDL.Record({
    'input_coins' : IDL.Vec(InputCoin),
    'output_coins' : IDL.Vec(OutputCoin),
    'action' : IDL.Text,
    'exchange_id' : IDL.Text,
    'pool_utxo_spend' : IDL.Vec(IDL.Text),
    'action_params' : IDL.Text,
    'nonce' : IDL.Nat64,
    'pool_utxo_receive' : IDL.Vec(IDL.Text),
    'pool_address' : IDL.Text,
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
  const Liquidity = IDL.Record({
    'total_share' : IDL.Nat,
    'user_share' : IDL.Nat,
    'user_incomes' : IDL.Nat64,
  });
  const Result_2 = IDL.Variant({ 'Ok' : Liquidity, 'Err' : ExchangeError });
  const GetMinimalTxValueArgs = IDL.Record({
    'zero_confirmed_tx_queue_length' : IDL.Nat32,
    'pool_address' : IDL.Text,
  });
  const GetPoolInfoArgs = IDL.Record({ 'pool_address' : IDL.Text });
  const Utxo = IDL.Record({
    'maybe_rune' : IDL.Opt(CoinBalance),
    'sats' : IDL.Nat64,
    'txid' : IDL.Text,
    'vout' : IDL.Nat32,
  });
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
  const NewBlockInfo = IDL.Record({
    'block_hash' : IDL.Text,
    'confirmed_txids' : IDL.Vec(IDL.Text),
    'block_timestamp' : IDL.Nat64,
    'block_height' : IDL.Nat32,
  });
  const Result_3 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const LiquidityOffer = IDL.Record({
    'output' : CoinBalance,
    'inputs' : IDL.Opt(Utxo),
    'nonce' : IDL.Nat64,
  });
  const Result_4 = IDL.Variant({
    'Ok' : LiquidityOffer,
    'Err' : ExchangeError,
  });
  const ExtractFeeOffer = IDL.Record({
    'output' : CoinBalance,
    'nonce' : IDL.Nat64,
    'input' : Utxo,
  });
  const Result_5 = IDL.Variant({
    'Ok' : ExtractFeeOffer,
    'Err' : ExchangeError,
  });
  const SwapOffer = IDL.Record({
    'output' : CoinBalance,
    'nonce' : IDL.Nat64,
    'input' : Utxo,
  });
  const Result_6 = IDL.Variant({ 'Ok' : SwapOffer, 'Err' : ExchangeError });
  const WithdrawalOffer = IDL.Record({
    'nonce' : IDL.Nat64,
    'input' : Utxo,
    'user_outputs' : IDL.Vec(CoinBalance),
  });
  const Result_7 = IDL.Variant({
    'Ok' : WithdrawalOffer,
    'Err' : ExchangeError,
  });
  const RollbackTxArgs = IDL.Record({ 'txid' : IDL.Text });
  return IDL.Service({
    'create' : IDL.Func([IDL.Text], [Result], []),
    'execute_tx' : IDL.Func([ExecuteTxArgs], [Result_1], []),
    'get_fee_collector' : IDL.Func([], [IDL.Text], ['query']),
    'get_lp' : IDL.Func([IDL.Text, IDL.Text], [Result_2], ['query']),
    'get_minimal_tx_value' : IDL.Func(
        [GetMinimalTxValueArgs],
        [IDL.Nat64],
        ['query'],
      ),
    'get_pool_info' : IDL.Func(
        [GetPoolInfoArgs],
        [IDL.Opt(PoolInfo)],
        ['query'],
      ),
    'get_pool_list' : IDL.Func([], [IDL.Vec(PoolBasic)], ['query']),
    'list_pools' : IDL.Func(
        [IDL.Opt(IDL.Text), IDL.Nat64],
        [IDL.Vec(PoolInfo)],
        ['query'],
      ),
    'new_block' : IDL.Func([NewBlockInfo], [Result_3], []),
    'pre_add_liquidity' : IDL.Func(
        [IDL.Text, CoinBalance],
        [Result_4],
        ['query'],
      ),
    'pre_extract_fee' : IDL.Func([IDL.Text], [Result_5], ['query']),
    'pre_swap' : IDL.Func([IDL.Text, CoinBalance], [Result_6], ['query']),
    'pre_withdraw_liquidity' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat],
        [Result_7],
        ['query'],
      ),
    'rollback_tx' : IDL.Func([RollbackTxArgs], [Result_3], []),
    'set_fee_collector' : IDL.Func([IDL.Text], [], []),
    'set_orchestrator' : IDL.Func([IDL.Principal], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
