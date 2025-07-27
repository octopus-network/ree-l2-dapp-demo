export const idlFactory = ({ IDL }) => {
  const BitcoinNetwork = IDL.Variant({
    'mainnet' : IDL.Null,
    'regtest' : IDL.Null,
    'testnet' : IDL.Null,
  });
  const EtchingStateArgs = IDL.Record({
    'ecdsa_key_name' : IDL.Text,
    'runes_indexer' : IDL.Principal,
    'etching_fee' : IDL.Opt(IDL.Nat64),
    'btc_network' : BitcoinNetwork,
    'mpc_principal' : IDL.Principal,
  });
  const EtchingUpgradeArgs = IDL.Variant({
    'Upgrade' : IDL.Opt(EtchingStateArgs),
    'Init' : EtchingStateArgs,
  });
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
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const UtxoArgs = IDL.Record({
    'id' : IDL.Text,
    'index' : IDL.Nat32,
    'amount' : IDL.Nat64,
  });
  const EtchingStatus = IDL.Variant({
    'SendRevealSuccess' : IDL.Null,
    'SendRevealFailed' : IDL.Null,
    'SendCommitFailed' : IDL.Null,
    'SendCommitSuccess' : IDL.Null,
    'Final' : IDL.Null,
    'Initial' : IDL.Null,
  });
  const SendEtchingInfo = IDL.Record({
    'status' : EtchingStatus,
    'script_out_address' : IDL.Text,
    'err_info' : IDL.Text,
    'commit_txid' : IDL.Text,
    'time_at' : IDL.Nat64,
    'etching_args' : EtchingArgs,
    'receiver' : IDL.Text,
    'reveal_txid' : IDL.Text,
  });
  const EtchingAccountInfo = IDL.Record({
    'derive_path' : IDL.Text,
    'pubkey' : IDL.Text,
    'address' : IDL.Text,
  });
  const SetTxFeePerVbyteArgs = IDL.Record({
    'low' : IDL.Nat64,
    'high' : IDL.Nat64,
    'medium' : IDL.Nat64,
  });
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  return IDL.Service({
    'etching' : IDL.Func([EtchingArgs], [Result], []),
    'etching_fee_utxos' : IDL.Func([], [IDL.Vec(UtxoArgs)], ['query']),
    'etching_reveal' : IDL.Func([IDL.Text], [], []),
    'get_etching_request' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(SendEtchingInfo)],
        ['query'],
      ),
    'init_etching_sender_account' : IDL.Func([], [EtchingAccountInfo], []),
    'query_etching_canister_by_runes' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Principal)],
        ['query'],
      ),
    'query_etching_fee' : IDL.Func([], [IDL.Nat64], ['query']),
    'set_etching_fee' : IDL.Func([IDL.Nat64], [], []),
    'set_etching_fee_utxos' : IDL.Func([IDL.Vec(UtxoArgs)], [], []),
    'set_tx_fee_per_vbyte' : IDL.Func([SetTxFeePerVbyteArgs], [Result_1], []),
  });
};
export const init = ({ IDL }) => {
  const BitcoinNetwork = IDL.Variant({
    'mainnet' : IDL.Null,
    'regtest' : IDL.Null,
    'testnet' : IDL.Null,
  });
  const EtchingStateArgs = IDL.Record({
    'ecdsa_key_name' : IDL.Text,
    'runes_indexer' : IDL.Principal,
    'etching_fee' : IDL.Opt(IDL.Nat64),
    'btc_network' : BitcoinNetwork,
    'mpc_principal' : IDL.Principal,
  });
  const EtchingUpgradeArgs = IDL.Variant({
    'Upgrade' : IDL.Opt(EtchingStateArgs),
    'Init' : EtchingStateArgs,
  });
  return [EtchingUpgradeArgs];
};
