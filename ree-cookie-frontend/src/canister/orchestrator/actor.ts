import { Actor, HttpAgent } from "@dfinity/agent";
import { ICP_HOST } from "../../constants";
import { idlFactory, _SERVICE as OrchestratorService, TxOutputType } from "./service.did";

const ORCHESTRATOR_CANISTER_ID = "hvyp5-5yaaa-aaaao-qjxha-cai"

export const ocActor = Actor.createActor<OrchestratorService>(idlFactory, {
  agent: HttpAgent.createSync({
    host: ICP_HOST,
    retryTimes: 30,
  }),
  canisterId: ORCHESTRATOR_CANISTER_ID,
});

export async function estimate_min_tx_fee(
	inputTypes: TxOutputType[],
	poolAddressList: string[],
	outputTypes: TxOutputType[]
): Promise<bigint> {
	return await ocActor
		.estimate_min_tx_fee({
			input_types: inputTypes,
			pool_address: poolAddressList,
			output_types: outputTypes
		})
		.then((res: { Err: string } | { Ok: bigint }) => {
			if ('Err' in res) {
				throw new Error(res.Err)
			}
			return res.Ok
		})
		.catch(error => {
			throw error
		})
}