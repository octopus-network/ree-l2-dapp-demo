import { useLaserEyes } from '@omnisat/lasereyes'
import { atom, useAtom, useAtomValue } from 'jotai'
import useSWR from 'swr'
import axios from 'axios'
import { useMemo } from 'react'
import { spentUtxosAtom } from 'store/spent-utxos'
import type { UnspentOutput } from 'types'
import { useLoginUserBtcUtxo } from './useUtxo'

export const pendingBtcUtxosAtom = atom<UnspentOutput[]>([])
export const pendingRuneUtxosAtom = atom<UnspentOutput[]>([])

export function usePendingBtcUtxos() {
	return useAtom(pendingBtcUtxosAtom)
}

export function usePendingRuneUtxos() {
	return useAtom(pendingRuneUtxosAtom)
}

export function useBtcUtxos(address: string | undefined, pubkey?: string) {
	const [pendingUtxos] = usePendingBtcUtxos()
	const spentUtxos = useAtomValue(spentUtxosAtom)

	const { data: apiUtxos } = useSWR(
		address
			? `https://api.omnity.network/api/utxos/btc?network=testnet&address=${address}${pubkey ? `&pubkey=${pubkey}` : ''}`
			: undefined,
		async (url: string) =>
			axios.get<{ data?: UnspentOutput[]; error: string }>(url).then(res => {
				if (res.data.error) {
					throw new Error(res.data.error)
				}
				return res.data.data
			}),
		{ refreshInterval: 5 * 60 * 1000 }
	)

	return useMemo(() => {
		return apiUtxos
			? apiUtxos
				.filter(
					c =>
						spentUtxos.findIndex(
							s => s.txid === c.txid && s.vout === c.vout
						) < 0
				)
				.concat(
					pendingUtxos.filter(
						p =>
							p.runes.length === 0 &&
							apiUtxos.findIndex(
								c => c.txid === p.txid && c.vout === p.vout
							) < 0
					)
				)
			: undefined
	}, [apiUtxos, pendingUtxos, spentUtxos])
}

export function useRuneUtxos(
	address: string | undefined,
	runeid?: string | undefined,
	pubkey?: string
) {
	const [pendingUtxos] = usePendingRuneUtxos();
	const spentUtxos = useAtomValue(spentUtxosAtom);
	const { data: apiUtxos } = useSWR(
		address && runeid
			? `https://api.omnity.network/api/utxos/rune?network=testnet&address=${address}${pubkey ? `&pubkey=${pubkey}` : ''}`
			: undefined,
		(url: string) =>
			axios.get<{ data?: UnspentOutput[]; error: string }>(url).then((res) => {
				if (res.data.error) {
					throw new Error(res.data.error);
				}
				return res.data.data;
			}),
		{ refreshInterval: 15 * 1000 }
	);

	return useMemo(
		() =>
			apiUtxos
				? apiUtxos
					.filter(
						(c) =>
							spentUtxos.findIndex(
								(s) => s.txid === c.txid && s.vout === c.vout
							) < 0
					)
					.concat(
						pendingUtxos.filter(
							(p) =>
								p.runes.length &&
								apiUtxos.findIndex(
									(c) => c.txid === p.txid && c.vout === p.vout
								) < 0
						)
					)
				: undefined,
		[apiUtxos, pendingUtxos, spentUtxos]
	);
}

// export function useWalletBtcUtxos() {
// 	const { paymentAddress, paymentPublicKey } = useLaserEyes()

// 	// const paymentUtxos = useBtcUtxos(paymentAddress, paymentPublicKey)

// 	const paymentUtxos = useLoginUserBtcUtxo(paymentAddress, paymentPublicKey)

// 	return useMemo(() => paymentUtxos, [paymentUtxos])
// }

export function useWalletRuneUtxos(runeid: string | undefined) {
  const { address, publicKey } = useLaserEyes(({ address, publicKey }) => ({
    address,
    publicKey,
  }));

  const utxos = useRuneUtxos(address, runeid, publicKey);

  return useMemo(() => utxos, [utxos]);
}
