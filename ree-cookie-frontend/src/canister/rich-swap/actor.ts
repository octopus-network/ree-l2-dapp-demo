import { Actor, HttpAgent } from "@dfinity/agent";
import { ICP_HOST } from "../../constants";
import { idlFactory, _SERVICE as RichSwapService } from "./service.did";

const RICHSWAP_CANISTER_ID = "h43eb-lqaaa-aaaao-qjxgq-cai"

export const swapActor = Actor.createActor<RichSwapService>(idlFactory, {
  agent: HttpAgent.createSync({
    host: ICP_HOST,
  }),
  canisterId: RICHSWAP_CANISTER_ID,
});