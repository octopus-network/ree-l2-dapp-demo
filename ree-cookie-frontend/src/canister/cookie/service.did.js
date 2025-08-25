export const idlFactory = ({ IDL }) => {
  const ReorgError = IDL.Variant({
    'DuplicateBlock' : IDL.Record({ 'height' : IDL.Nat32, 'hash' : IDL.Text }),
    'BlockNotFoundInState' : IDL.Record({ 'height' : IDL.Nat32 }),
    'Unrecoverable' : IDL.Null,
    'Recoverable' : IDL.Record({ 'height' : IDL.Nat32, 'depth' : IDL.Nat32 }),
  });
  const GameStatus = IDL.Variant({
    'WaitAddedLiquidity' : IDL.Null,
    'Playing' : IDL.Null,
    'Withdrawing' : IDL.Null,
    'Etching' : IDL.Null,
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
    'PoolNotFound' : IDL.Text,
    'RuneNotFound' : IDL.Text,
    'CookieBalanceInsufficient' : IDL.Nat,
    'GameEnd' : IDL.Null,
    'ReorgError' : ReorgError,
    'GamerAlreadyExist' : IDL.Text,
    'DuplicateBlock' : IDL.Tuple(IDL.Nat32, IDL.Text),
    'PoolStateExpired' : IDL.Nat64,
    'GamerNotFound' : IDL.Text,
    'GameStatusNotMatch' : IDL.Tuple(GameStatus, GameStatus),
    'GameNotEnd' : IDL.Null,
    'TooSmallFunds' : IDL.Null,
    'Unrecoverable' : IDL.Null,
    'LastStateNotFound' : IDL.Null,
    'InvalidRuneId' : IDL.Null,
    'InvalidPool' : IDL.Null,
    'InvalidPsbt' : IDL.Text,
    'GameNotFound' : IDL.Nat64,
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
    'PoolAddressMismatch' : IDL.Record({
      'actual' : IDL.Text,
      'expected' : IDL.Text,
    }),
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : ExchangeError });
  const CreateGameArgs = IDL.Record({
    'rune_premine_amount' : IDL.Nat,
    'create_address' : IDL.Text,
    'claim_amount_per_click' : IDL.Nat,
    'game_name' : IDL.Text,
    'claim_cooling_down' : IDL.Nat64,
    'gamer_register_fee' : IDL.Nat64,
  });
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
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
  const UserAction = IDL.Variant({
    'Withdraw' : IDL.Text,
    'AddLiquidity' : IDL.Null,
    'Init' : IDL.Null,
    'Register' : IDL.Text,
  });
  const PoolState = IDL.Record({
    'id' : IDL.Text,
    'utxo' : Utxo,
    'user_action' : UserAction,
    'nonce' : IDL.Nat64,
  });
  const Pool = IDL.Record({
    'states' : IDL.Vec(PoolState),
    'name' : IDL.Text,
    'pubkey' : IDL.Text,
    'key_derivation_path' : IDL.Text,
    'attributes' : IDL.Text,
    'address' : IDL.Text,
    'nonce' : IDL.Nat64,
    'pending_transaction_counts' : IDL.Nat64,
  });
  const RuneInfo = IDL.Record({ 'rune_name' : IDL.Text, 'rune_id' : IDL.Text });
  const Gamer = IDL.Record({
    'is_withdrawn' : IDL.Bool,
    'last_click_time' : IDL.Nat64,
    'address' : IDL.Text,
    'cookies' : IDL.Nat,
  });
  const Game = IDL.Record({
    'creator' : IDL.Principal,
    'claimed_cookies' : IDL.Nat,
    'rune_premine_amount' : IDL.Nat,
    'creator_address' : IDL.Text,
    'pool' : IDL.Opt(Pool),
    'rune_info' : IDL.Opt(RuneInfo),
    'gamers' : IDL.Vec(IDL.Tuple(IDL.Text, Gamer)),
    'claim_amount_per_click' : IDL.Nat,
    'game_id' : IDL.Nat64,
    'game_status' : GameStatus,
    'game_name' : IDL.Text,
    'etch_rune_commit_tx' : IDL.Text,
    'claim_cooling_down' : IDL.Nat64,
    'gamer_register_fee' : IDL.Nat64,
  });
  const ExchangeState = IDL.Record({
    'txid_game_map' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64)),
    'orchestrator' : IDL.Principal,
    'games' : IDL.Vec(IDL.Tuple(IDL.Nat64, Game)),
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
  const NewBlockInfo = IDL.Record({
    'block_hash' : IDL.Text,
    'confirmed_txids' : IDL.Vec(IDL.Text),
    'block_timestamp' : IDL.Nat64,
    'block_height' : IDL.Nat32,
  });
  const Result_3 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const AddLiquidityInfo = IDL.Record({
    'btc_amount_for_add_liquidity' : IDL.Nat64,
    'rune_amount_for_add_liquidity' : IDL.Nat,
  });
  const RollbackTxArgs = IDL.Record({ 'txid' : IDL.Text });
  return IDL.Service({
    'claim' : IDL.Func([IDL.Nat64], [Result], []),
    'create_game' : IDL.Func([CreateGameArgs], [Result_1], []),
    'etch_rune' : IDL.Func([IDL.Nat64, IDL.Text], [Result_2], []),
    'execute_tx' : IDL.Func([ExecuteTxArgs], [Result_2], []),
    'finalize_etch' : IDL.Func([IDL.Nat64], [Result_2], []),
    'get_exchange_state' : IDL.Func([], [ExchangeState], ['query']),
    'get_game_info' : IDL.Func([IDL.Nat64], [IDL.Opt(Game)], ['query']),
    'get_game_pool_address' : IDL.Func([IDL.Nat64], [IDL.Text], []),
    'get_games_info' : IDL.Func([], [IDL.Vec(Game)], ['query']),
    'get_pool_info' : IDL.Func(
        [GetPoolInfoArgs],
        [IDL.Opt(PoolInfo)],
        ['query'],
      ),
    'get_pool_list' : IDL.Func([], [IDL.Vec(PoolBasic)], ['query']),
    'new_block' : IDL.Func([NewBlockInfo], [Result_3], []),
    'query_add_liquidity_info' : IDL.Func(
        [IDL.Nat64],
        [AddLiquidityInfo],
        ['query'],
      ),
    'reset_blocks' : IDL.Func([], [], []),
    'rollback_tx' : IDL.Func([RollbackTxArgs], [Result_3], []),
  });
};
export const init = ({ IDL }) => { return [IDL.Principal]; };
