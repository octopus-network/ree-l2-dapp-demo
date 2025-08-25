import { Actor, ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import { ICP_HOST } from "../../constants";
import { idlFactory, _SERVICE as CookieService, Game, GameStatus, GameAndPool, Metadata } from "./service.did";

export const COOKIE_CANISTER_ID = "k5j3t-jaaaa-aaaah-arcra-cai"

export const cookieActor = Actor.createActor<CookieService>(idlFactory, {
  agent: HttpAgent.createSync({
    host: ICP_HOST,
  }),
  canisterId: COOKIE_CANISTER_ID,
});

export function cookieActorWithIdentity(
  identity: Identity
): ActorSubclass<CookieService>{
  return Actor.createActor<CookieService>(idlFactory, {
    agent: HttpAgent.createSync({
      host: ICP_HOST,
      identity
    }),
    canisterId: COOKIE_CANISTER_ID,
  })
}

export type GameStatusStr = "Etching" | "Playing" | "WaitAddedLiquidity" | "Withdrawing"

export function game_status_str(game_status: GameStatus): GameStatusStr {
  let s = Object.entries(game_status)[0]![0];
  if(["Etching", "Playing", "WaitAddedLiquidity", "Withdrawing"].includes(s)) {
    return s as GameStatusStr;
  } else {
    throw new Error(`Invalid game status: ${s}`);
  }
}

// export function get_pool_meta(game_and_pool: GameAndPool): Metadata | undefined {
//   if(game_and_pool.pool_metadata.length ==0) {
//     return undefined;
//   } else {
//     game_and_pool.pool_metadata[0]!
//   }
// }

// export function get_btc_pool(game: Game): Pool {
//   return game.pool_manager.btc_pools[0]?.[1]!;
// }

// export function get_rune_pool(game: Game): Pool {
//   return game.pool_manager.rune_pool[0]!;
// }