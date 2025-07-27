export const idlFactory = ({ IDL }) => {
  const Delegation = IDL.Record({
    'pubkey' : IDL.Vec(IDL.Nat8),
    'targets' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'expiration' : IDL.Nat64,
  });
  const SignedDelegation = IDL.Record({
    'signature' : IDL.Vec(IDL.Nat8),
    'delegation' : Delegation,
  });
  const Result = IDL.Variant({ 'Ok' : SignedDelegation, 'Err' : IDL.Text });
  const CustomSignature = IDL.Variant({
    'Bip322' : IDL.Tuple(IDL.Text, IDL.Text, IDL.Text),
  });
  const Result_1 = IDL.Variant({
    'Ok' : IDL.Tuple(IDL.Vec(IDL.Nat8), IDL.Nat64),
    'Err' : IDL.Text,
  });
  return IDL.Service({
    'get_delegation' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Nat8), IDL.Nat64],
        [Result],
        ['query'],
      ),
    'get_principal' : IDL.Func([IDL.Text], [IDL.Principal], ['query']),
    'prepare_delegation' : IDL.Func(
        [IDL.Opt(IDL.Nat64), CustomSignature],
        [Result_1],
        [],
      ),
    'whoami' : IDL.Func([], [IDL.Principal], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
