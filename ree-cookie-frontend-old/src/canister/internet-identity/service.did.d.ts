import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type CustomSignature = { 'Bip322' : [string, string, string] };
export interface Delegation {
  'pubkey' : Uint8Array | number[],
  'targets' : [] | [Array<Principal>],
  'expiration' : bigint,
}
export type Result = { 'Ok' : SignedDelegation } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : [Uint8Array | number[], bigint] } |
  { 'Err' : string };
export interface SignedDelegation {
  'signature' : Uint8Array | number[],
  'delegation' : Delegation,
}
export interface _SERVICE {
  'get_delegation' : ActorMethod<
    [string, Uint8Array | number[], bigint],
    Result
  >,
  'get_principal' : ActorMethod<[string], Principal>,
  'prepare_delegation' : ActorMethod<
    [[] | [bigint], CustomSignature],
    Result_1
  >,
  'whoami' : ActorMethod<[], Principal>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
