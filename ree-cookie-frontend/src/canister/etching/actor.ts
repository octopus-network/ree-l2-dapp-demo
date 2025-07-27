import { Actor, HttpAgent } from "@dfinity/agent";
import { ICP_HOST } from "../../constants";
import { idlFactory, _SERVICE as EtchingService } from "./service.did";

const ETCHING_CANISTER_ID = "e2rzq-6iaaa-aaaan-qz2ca-cai"

export const etchActor = Actor.createActor<EtchingService>(idlFactory, {
  agent: HttpAgent.createSync({
    host: ICP_HOST,
    retryTimes: 30,
  }),
  canisterId: ETCHING_CANISTER_ID,
});