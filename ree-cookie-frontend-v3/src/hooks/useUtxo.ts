import { useLaserEyes } from '@omnisat/lasereyes'
import { useQuery } from '@tanstack/react-query'
import { MempoolUtxo, getAddressUtxo } from 'api/mempool'
import type { GetUtxoData, UnisatApiResponse, UnisatUtxo } from 'api/unisat'
import {
	convertUnisatRuneUtxo,
	getRuneUtxo,
	getUtxoData
} from 'api/unisat'
import { ocActor } from 'canister/orchestrator/actor'
import { OrchestratorStatus } from 'canister/orchestrator/service.did'
import { useAtomValue } from 'jotai'
import { spentUtxosAtom } from 'store/spent-utxos'
import { UnspentOutput } from 'types/utxo'

type UtxoRes ={
	utxoFromMempool: MempoolUtxo[], 
	utxoFromUnisat: UnisatApiResponse<GetUtxoData>,
	ocStatus: OrchestratorStatus, 
	filteredUtxo: UnisatUtxo[]
	spentOutPointSet: any
}

export function useUserBtcUtxoDebug(paymentAddress: string | undefined) {
	// const { paymentAddress } = useLaserEyes()
	const spentUtxos = useAtomValue(spentUtxosAtom);
	return useQuery<UtxoRes>({
		enabled: !!paymentAddress,
		queryKey: ['unisat-utxos-data', paymentAddress],
		// todo filter spend utxo
		queryFn: async () => {
			const spentOutPointSet = new Set()
			spentUtxos.forEach(e => spentOutPointSet.add(`${e.txid}:${e.vout}`))
			const res = await getUtxoData(paymentAddress!)
			const ocStatus = await ocActor.get_status()
			const utxoFromMempool = await getAddressUtxo(paymentAddress!) ?? []
			const findUtxoHeightInMempool = (txid: string, vout: number) => {
				const utxo = utxoFromMempool.find(e => e.txid === txid && e.vout === vout)
				return utxo?.status.block_height
			}
			let filteredUtxo = res.data.utxo
				.filter(
					(e) => !spentOutPointSet.has(`${e.txid}:${e.vout}`)
				)
				.filter(
					e => {
						let block_height_from_mempool = findUtxoHeightInMempool(e.txid, e.vout)
						if (block_height_from_mempool === undefined) return false
						return block_height_from_mempool <= (ocStatus.last_block?.[0]?.block_height ?? 0)
					}
				)
			console.log({utxoFromMempool, ocStatus, res, filteredUtxo})
			return {
				filteredUtxo,
				utxoFromMempool,
				utxoFromUnisat: res,
				ocStatus,
				spentOutPointSet
			}
		},
		refetchInterval: 15 * 1000 // Refetch every 15 s
	})
}

export function useLoginUserBtcUtxo() {
	const { paymentAddress } = useLaserEyes()
	const spentUtxos = useAtomValue(spentUtxosAtom);
	return useQuery<UnisatUtxo[]>({
		enabled: !!paymentAddress,
		queryKey: ['unisat-utxo-data', paymentAddress],
		// todo filter spend utxo
		queryFn: async () => {
			const spentOutPointSet = new Set()
			spentUtxos.forEach(e => spentOutPointSet.add(`${e.txid}:${e.vout}`))
			const res = await getUtxoData(paymentAddress)
			const ocStatus = await ocActor.get_status()
			const utxoFromMempool = await getAddressUtxo(paymentAddress) ?? []
			const findUtxoHeightInMempool = (txid: string, vout: number) => {
				const utxo = utxoFromMempool.find(e => e.txid === txid && e.vout === vout)
				return utxo?.status.block_height
			}
			let filteredUtxo = res.data.utxo
				.filter(
					(e) => !spentOutPointSet.has(`${e.txid}:${e.vout}`)
				)
				.filter(
					e => {
						let block_height_from_mempool = findUtxoHeightInMempool(e.txid, e.vout)
						if (block_height_from_mempool === undefined) return false
						return block_height_from_mempool <= (ocStatus.last_block?.[0]?.block_height ?? 0)
					}
				)
			console.log({utxoFromMempool, ocStatus, res, filteredUtxo})
			return filteredUtxo
		},
		refetchInterval: 15 * 1000 // Refetch every 15 s
	})
}

export function useLoginUserRuneUtxo(runeId: string | undefined) {
	const { address, publicKey } = useLaserEyes()
	const spentUtxos = useAtomValue(spentUtxosAtom);

	return useQuery<UnspentOutput[]>({
		enabled: !!address && !!runeId,
		queryKey: ['unisat-rune-utxo', address],
		queryFn: async () => {
			const res = await getRuneUtxo(address, runeId!)
			const apiOutpointSet = new Set()
			res.data.utxo.forEach(e => apiOutpointSet.add(`${e.txid}:${e.vout}`))
			const ocStatus = await ocActor.get_status()
			return res
				.data
				.utxo
				.filter(utxo =>
					spentUtxos
						.find(e => (e.txid === utxo.txid && e.vout === utxo.vout)) === undefined
				)
				.filter(
					e => e.height <= (ocStatus.last_block?.[0]?.block_height ?? 0)
				)
				.map(e => convertUnisatRuneUtxo(e, publicKey))
			// .concat(
			// 	pendingUtxos.filter(e=>!apiOutpointSet.has(`${e.txid}:${e.vout}`)&&(e.runes.length>0))
			// )
		},
		refetchInterval: 15 * 1000 // Refetch every 15 s
	})
}
