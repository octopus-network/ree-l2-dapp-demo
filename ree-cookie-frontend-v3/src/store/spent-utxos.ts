import type { UnspentOutput } from '../types'
import { atom, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { produce } from 'immer'

export const spentUtxosAtom = atomWithStorage<UnspentOutput[]>(
	'spent-utxos',
	[]
)

export const addSpentUtxosAtom = atom(
	null,
	(get, set, utxos: UnspentOutput[]) => {
		// const previous = get(spentUtxosAtom)
		// 	// filter out utxos that are older than 4 hours
		// 	.filter(e => e.timestamp ?? 0 < Date.now() - 1000 * 60 * 60 * 4)
		// 	.concat(utxos)

		// const next = produce(previous, draft => draft.concat(utxos))

		set(
			spentUtxosAtom,
			get(spentUtxosAtom)
				// filter out utxos that are older than 4 hours
				.filter(e => e.timestamp ?? 0 < Date.now() - 1000 * 60 * 60 * 4)
				.concat(utxos)
		)
	}
)

export const removeSpentUtxosAtom = atom(
	null,
	(get, set, utxos: UnspentOutput[]) => {
		const previous = get(spentUtxosAtom)
		const next = produce(previous, draft =>
			draft.filter(
				d => utxos.findIndex(u => d.txid === u.txid && d.vout === u.vout) < 0
			)
		)
		set(spentUtxosAtom, next)
	}
)

export function useAddSpentUtxos() {
	return useSetAtom(addSpentUtxosAtom)
}

export function useRemoveSpentUtxos() {
	return useSetAtom(removeSpentUtxosAtom)
}
