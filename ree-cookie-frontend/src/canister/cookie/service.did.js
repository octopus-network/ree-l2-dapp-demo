export const idlFactory = ({ IDL }) => {
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
    'GameNotFound' : IDL.Text,
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
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const OrdinalsTerms = IDL.Record({
    'cap' : IDL.Nat,
    'height' : IDL.Tuple(IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)),
    'offset' : IDL.Tuple(IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)),
    'amount' : IDL.Nat,
  });
  const LogoParams = IDL.Record({
    'content_type' : IDL.Text,
    'content_base64' : IDL.Text,
  });
  const EtchingArgs = IDL.Record({
    'terms' : IDL.Opt(OrdinalsTerms),
    'turbo' : IDL.Bool,
    'premine' : IDL.Opt(IDL.Nat),
    'logo' : IDL.Opt(LogoParams),
    'rune_name' : IDL.Text,
    'divisibility' : IDL.Opt(IDL.Nat8),
    'premine_receiver' : IDL.Text,
    'symbol' : IDL.Opt(IDL.Text),
  });
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
    'rune_info' : IDL.Opt(RuneInfo),
    'gamers' : IDL.Vec(IDL.Tuple(IDL.Text, Gamer)),
    'claim_amount_per_click' : IDL.Nat,
    'game_id' : IDL.Text,
    'game_status' : GameStatus,
    'game_name' : IDL.Text,
    'etch_rune_commit_tx' : IDL.Text,
    'pool_address' : IDL.Opt(IDL.Text),
    'claim_cooling_down' : IDL.Nat64,
    'gamer_register_fee' : IDL.Nat64,
  });
  const ExchangeState = IDL.Record({
    'txid_game_map' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'games' : IDL.Vec(IDL.Tuple(IDL.Text, Game)),
  });
  const UserAction = IDL.Variant({
    'Withdraw' : IDL.Tuple(IDL.Text, IDL.Text),
    'AddLiquidity' : IDL.Null,
    'Init' : IDL.Null,
    'Register' : IDL.Tuple(IDL.Text, IDL.Text),
  });
  const CookiePoolState = IDL.Record({
    'txid' : IDL.Text,
    'utxo' : Utxo,
    'user_action' : UserAction,
    'nonce' : IDL.Nat64,
  });
  const Metadata = IDL.Record({
    'key' : IDL.Text,
    'name' : IDL.Text,
    'key_derivation_path' : IDL.Vec(IDL.Vec(IDL.Nat8)),
    'address' : IDL.Text,
  });
  const GameAndPool = IDL.Record({
    'game' : Game,
    'pool_state' : IDL.Opt(CookiePoolState),
    'pool_metadata' : IDL.Opt(Metadata),
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
  const Result_2 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const AddLiquidityInfo = IDL.Record({
    'btc_amount_for_add_liquidity' : IDL.Nat64,
    'rune_amount_for_add_liquidity' : IDL.Nat,
  });
  const RollbackTxArgs = IDL.Record({
    'txid' : IDL.Text,
    'reason_code' : IDL.Text,
  });
  return IDL.Service({
    'claim' : IDL.Func([IDL.Text], [Result], []),
    'create_game' : IDL.Func([CreateGameArgs], [Result_1], []),
    'etch' : IDL.Func([EtchingArgs], [Result_1], []),
    'etch_rune' : IDL.Func([IDL.Text, IDL.Text], [Result_1], []),
    'execute_tx' : IDL.Func([ExecuteTxArgs], [Result_1], []),
    'finalize_etch' : IDL.Func([IDL.Text], [Result_1], []),
    'game_address' : IDL.Func([IDL.Text], [Result_1], []),
    'get_exchange_state' : IDL.Func([], [ExchangeState], ['query']),
    'get_game_info' : IDL.Func([IDL.Text], [IDL.Opt(GameAndPool)], ['query']),
    'get_game_pool_address' : IDL.Func([IDL.Text], [IDL.Text], []),
    'get_games_info' : IDL.Func([], [IDL.Vec(GameAndPool)], ['query']),
    'get_pool_info' : IDL.Func(
        [GetPoolInfoArgs],
        [IDL.Opt(PoolInfo)],
        ['query'],
      ),
    'get_pool_list' : IDL.Func([], [IDL.Vec(PoolBasic)], ['query']),
    'new_block' : IDL.Func([NewBlockInfo], [Result_2], []),
    'query_add_liquidity_info' : IDL.Func(
        [IDL.Text],
        [AddLiquidityInfo],
        ['query'],
      ),
    'query_etching_list' : IDL.Func([IDL.Text], [IDL.Vec(IDL.Text)], ['query']),
    'rollback_tx' : IDL.Func([RollbackTxArgs], [Result_2], []),
  });
};
export const init = ({ IDL }) => { return []; };
