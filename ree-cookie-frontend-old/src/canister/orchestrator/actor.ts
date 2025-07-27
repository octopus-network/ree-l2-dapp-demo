import { Actor, HttpAgent } from "@dfinity/agent";
import { ICP_HOST } from "../../constants";
import { idlFactory, _SERVICE as OrchestratorService } from "./service.did";

const ORCHESTRATOR_CANISTER_ID = "hvyp5-5yaaa-aaaao-qjxha-cai"

export const ocActor = Actor.createActor<OrchestratorService>(idlFactory, {
  agent: HttpAgent.createSync({
    host: ICP_HOST,
    retryTimes: 30,
  }),
  canisterId: ORCHESTRATOR_CANISTER_ID,
});
