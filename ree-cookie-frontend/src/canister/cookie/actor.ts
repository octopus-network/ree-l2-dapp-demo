import { Actor, ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import { ICP_HOST } from "../../constants";
import { idlFactory, _SERVICE as CookieService, Game, GameStatus, Pool } from "./service.did";

const COOKIE_CANISTER_ID = "k5j3t-jaaaa-aaaah-arcra-cai"

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

export function game_status_str(game_status: GameStatus): string {
  return Object.entries(game_status)[0]![0];
}

export function get_btc_pool(game: Game): Pool {
  return game.pool_manager.btc_pools[0]?.[1]!;
}

export function get_rune_pool(game: Game): Pool {
  return game.pool_manager.rune_pool[0]!;
}