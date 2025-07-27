import { Actor, HttpAgent } from '@dfinity/agent'
import type {
	_SERVICE as OrchestratorService,
	OutpointWithValue,
	TxOutputType
} from './service.did'
import { idlFactory } from './service.did'
import { ICP_HOST } from '../../constants/common'
import { UnspentOutput } from 'types/utxo'
import { getAddressType } from 'utils/address'

const ORCHESTRATOR_CANISTER_ID = 'hvyp5-5yaaa-aaaao-qjxha-cai'
export const ORDI_EXCHANGE_ID = 'rich_ordi'

export const ocActor = Actor.createActor<OrchestratorService>(idlFactory, {
	agent: HttpAgent.createSync({
		host: ICP_HOST,
		retryTimes: 30
	}),
	canisterId: ORCHESTRATOR_CANISTER_ID
})

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

// export async function getUnconfirmedUtxos(
// 	address: string,
// 	pubkey = ""
// ): Promise<UnspentOutput[]> {
// 	const res = (await ocActor.get_zero_confirmed_utxos_of_address(
// 		address
// 	)) as OutpointWithValue[];

// 	const addressType = getAddressType(address);

// 	return res.map(({ value, script_pubkey_hex, outpoint, maybe_rune }) => {
// 		const [txid, vout] = outpoint.split(":");
// 		const rune = maybe_rune[0];
// 		return {
// 			txid,
// 			vout: Number(vout),
// 			satoshis: value.toString(),
// 			scriptPk: script_pubkey_hex,
// 			pubkey,
// 			addressType,
// 			address,
// 			runes: rune
// 				? [
// 						{
// 							id: rune.id,
// 							amount: rune.value.toString(),
// 						},
// 					]
// 				: [],
// 		};
// 	});
// }