export const idlFactory = ({ IDL }) => {
  const ReorgError = IDL.Variant({
    'DuplicateBlock' : IDL.Record({ 'height' : IDL.Nat32, 'hash' : IDL.Text }),
    'BlockNotFoundInState' : IDL.Record({ 'height' : IDL.Nat32 }),
    'Unrecoverable' : IDL.Null,
    'Recoverable' : IDL.Record({ 'height' : IDL.Nat32, 'depth' : IDL.Nat32 }),
  });
  const RejectionCode = IDL.Variant({
    'NoError' : IDL.Null,
    'CanisterError' : IDL.Null,
    'SysTransient' : IDL.Null,
    'DestinationInvalid' : IDL.Null,
    'Unknown' : IDL.Null,
    'SysFatal' : IDL.Null,
    'CanisterReject' : IDL.Null,
  });
  const ExchangeError = IDL.Variant({
    'InvalidSignPsbtArgs' : IDL.Text,
    'InvalidNumeric' : IDL.Null,
    'ParseUtxoRuneBalanceError' : IDL.Text,
    'Overflow' : IDL.Null,
    'InvalidInput' : IDL.Null,
    'PoolAddressNotFound' : IDL.Null,
    'NatConvertError' : IDL.Nat,
    'CookieBalanceInsufficient' : IDL.Nat,
    'GameEnd' : IDL.Null,
    'ReorgError' : ReorgError,
    'GamerAlreadyExist' : IDL.Text,
    'DuplicateBlock' : IDL.Tuple(IDL.Nat32, IDL.Text),
    'PoolStateExpired' : IDL.Nat64,
    'GamerNotFound' : IDL.Text,
    'GameNotEnd' : IDL.Null,
    'TooSmallFunds' : IDL.Null,
    'Unrecoverable' : IDL.Null,
    'LastStateNotFound' : IDL.Null,
    'InvalidRuneId' : IDL.Null,
    'InvalidPool' : IDL.Null,
    'InvalidPsbt' : IDL.Text,
    'PoolAlreadyExists' : IDL.Null,
    'GamerCoolingDown' : IDL.Tuple(IDL.Text, IDL.Nat64),
    'InvalidTxid' : IDL.Text,
    'InvalidLiquidity' : IDL.Null,
    'DepositRuneBalanceIncorrect' : IDL.Tuple(IDL.Text, IDL.Text),
    'EmptyPool' : IDL.Null,
    'RuneIndexerResultError' : IDL.Text,
    'LpNotFound' : IDL.Null,
    'ChainKeyError' : IDL.Null,
    'FetchRuneIndexerError' : IDL.Tuple(RejectionCode, IDL.Text),
    'CustomError' : IDL.Text,
    'InvalidState' : IDL.Text,
    'Recoverable' : IDL.Tuple(IDL.Nat32, IDL.Nat32),
    'InsufficientFunds' : IDL.Null,
    'GamerWithdrawRepeatedly' : IDL.Text,
    'RuneIdNotMatch' : IDL.Tuple(IDL.Text, IDL.Text),
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : ExchangeError });
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
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
  const Utxo = IDL.Record({
    'maybe_rune' : IDL.Opt(CoinBalance),
    'sats' : IDL.Nat64,
    'txid' : IDL.Text,
    'vout' : IDL.Nat32,
  });
  const UserAction = IDL.Variant({
    'Withdraw' : IDL.Text,
    'AddLiquidity' : IDL.Null,
    'Init' : IDL.Null,
    'Register' : IDL.Text,
  });
  const PoolState = IDL.Record({
    'id' : IDL.Opt(IDL.Text),
    'utxo' : Utxo,
    'user_action' : UserAction,
    'nonce' : IDL.Nat64,
  });
  const Game = IDL.Record({
    'claimed_cookies' : IDL.Nat,
    'cookie_amount_per_claim' : IDL.Nat,
    'is_end' : IDL.Bool,
    'start_time' : IDL.Nat64,
    'already_add_liquidity' : IDL.Bool,
    'claim_cooling_down' : IDL.Nat64,
    'gamer_register_fee' : IDL.Nat64,
  });
  const GameStatus = IDL.Variant({
    'AddLiquidity' : IDL.Null,
    'InitUtxo' : IDL.Null,
    'Play' : IDL.Null,
    'Withdrawable' : IDL.Null,
    'InitKey' : IDL.Null,
  });
  const ExchangeState = IDL.Record({
    'key' : IDL.Opt(IDL.Text),
    'states' : IDL.Vec(PoolState),
    'game' : Game,
    'richswap_pool_address' : IDL.Text,
    'rune_name' : IDL.Text,
    'etching_key' : IDL.Opt(IDL.Text),
    'orchestrator' : IDL.Principal,
    'game_status' : GameStatus,
    'btc_customs_principle' : IDL.Principal,
    'address' : IDL.Opt(IDL.Text),
    'ii_canister' : IDL.Principal,
    'key_path' : IDL.Text,
    'rune_id' : IDL.Opt(IDL.Text),
  });
  const Gamer = IDL.Record({
    'is_withdrawn' : IDL.Bool,
    'last_click_time' : IDL.Nat64,
    'address' : IDL.Text,
    'cookies' : IDL.Nat,
  });
  const GameAndGamer = IDL.Record({
    'claimed_cookies' : IDL.Nat,
    'cookie_amount_per_claim' : IDL.Nat,
    'is_end' : IDL.Bool,
    'gamer' : IDL.Opt(Gamer),
    'claim_cooling_down' : IDL.Nat64,
    'gamer_register_fee' : IDL.Nat64,
  });
  const GetMinimalTxValueArgs = IDL.Record({
    'zero_confirmed_tx_queue_length' : IDL.Nat32,
    'pool_address' : IDL.Text,
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
  const RegisterInfo = IDL.Record({
    'tweaked_key' : IDL.Text,
    'utxo' : Utxo,
    'untweaked_key' : IDL.Text,
    'address' : IDL.Text,
    'nonce' : IDL.Nat64,
    'register_fee' : IDL.Nat64,
  });
  const Result_2 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : ExchangeError });
  const Result_3 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : ExchangeError });
  const NewBlockInfo = IDL.Record({
    'block_hash' : IDL.Text,
    'confirmed_txids' : IDL.Vec(IDL.Text),
    'block_timestamp' : IDL.Nat64,
    'block_height' : IDL.Nat32,
  });
  const Result_4 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const AddLiquidityInfo = IDL.Record({
    'btc_amount_for_add_liquidity' : IDL.Nat64,
    'rune_amount_for_add_liquidity' : IDL.Nat,
  });
  const RollbackTxArgs = IDL.Record({ 'txid' : IDL.Text });
  return IDL.Service({
    'claim' : IDL.Func([], [Result], []),
    'end_game' : IDL.Func([], [], []),
    'etch_rune' : IDL.Func([], [Result_1], []),
    'execute_tx' : IDL.Func([ExecuteTxArgs], [Result_1], []),
    'get_chain_key_btc_address' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'get_exchange_state' : IDL.Func([], [ExchangeState], ['query']),
    'get_game_and_gamer_infos' : IDL.Func(
        [IDL.Text],
        [GameAndGamer],
        ['query'],
      ),
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
    'get_pool_states' : IDL.Func([], [IDL.Vec(PoolState)], ['query']),
    'get_register_info' : IDL.Func([], [RegisterInfo], ['query']),
    'init_key' : IDL.Func([], [Result_2], []),
    'init_utxo' : IDL.Func([Utxo], [Result_3], []),
    'new_block' : IDL.Func([NewBlockInfo], [Result_4], []),
    'query_add_liquidity_info' : IDL.Func([], [AddLiquidityInfo], ['query']),
    'reset_blocks' : IDL.Func([], [], []),
    'rollback_tx' : IDL.Func([RollbackTxArgs], [Result_4], []),
  });
};
export const init = ({ IDL }) => {
  return [
    IDL.Text,
    IDL.Text,
    IDL.Nat64,
    IDL.Nat64,
    IDL.Nat,
    IDL.Principal,
    IDL.Principal,
    IDL.Principal,
    IDL.Text,
  ];
};
