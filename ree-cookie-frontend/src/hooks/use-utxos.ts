// import { UnspentOutput } from "@/types";

import { useMemo } from "react";

import { useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
// import { spentUtxosAtom } from "../store/spent-utxos";
import axios from "axios";

import useSWR from "swr";
import { useLaserEyes } from "@omnisat/lasereyes";
import { atom, useAtom } from "jotai";
import { UnspentOutput } from "../types";
import { useQuery } from "@tanstack/react-query";
import { GetUtxoData, getUtxoData, UnisatApiResponse, UnisatUtxo } from "api/unisat";
import { ocActor } from "canister/orchestrator/actor";
import { getAddressUtxo, MempoolUtxo } from "api/mempool";
import { OrchestratorStatus } from "canister/orchestrator/service.did";
import { getUserBtcUtxosFromMaestro, getUserRuneUtxosFromMaestro, MaestroUtxo } from "api/maestro";

export const spentUtxosAtom = atomWithStorage<UnspentOutput[]>(
  "spent-utxos",
  []
);

export const pendingBtcUtxosAtom = atom<UnspentOutput[]>([]);
export const pendingRuneUtxosAtom = atom<UnspentOutput[]>([]);

export function usePendingBtcUtxos() {
  return useAtom(pendingBtcUtxosAtom);
}

export function usePendingRuneUtxos() {
  return useAtom(pendingRuneUtxosAtom);
}

export type UtxoRes ={
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
		queryKey: ['unisat-utxos-data-debug', paymentAddress],
		// todo filter spend utxo
		queryFn: async () => {
			const spentOutPointSet = new Set()
			spentUtxos.forEach(e => spentOutPointSet.add(`${e.txid}:${e.vout}`))
			const res = await getUtxoData(paymentAddress!)
			const ocStatus = await ocActor.get_status()
			// const utxoFromMempool = await getAddressUtxo(paymentAddress!) ?? []
			// const findUtxoHeightInMempool = (txid: string, vout: number) => {
			// 	const utxo = utxoFromMempool.find(e => e.txid === txid && e.vout === vout)
			// 	return utxo?.status.block_height
			// }
			let filteredUtxo = res.data.utxo
				.filter(
					(e) => !spentOutPointSet.has(`${e.txid}:${e.vout}`)
				)
				.filter(
					e => {
						// let block_height_from_mempool = findUtxoHeightInMempool(e.txid, e.vout)
						// if (block_height_from_mempool === undefined) return false
            // e.height
						return e.height <= (ocStatus.last_block?.[0]?.block_height ?? 0)
					}
				)
			console.log({
        // utxoFromMempool, 
        ocStatus, 
        res, 
        filteredUtxo})
			return {
				filteredUtxo,
				utxoFromMempool: [],
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
	return useQuery<MaestroUtxo[]>({
		enabled: !!paymentAddress,
		queryKey: ['unisat-utxo-data', paymentAddress],
		// todo filter spend utxo
		queryFn: async () => {
			const spentOutPointSet = new Set()
			spentUtxos.forEach(e => spentOutPointSet.add(`${e.txid}:${e.vout}`))
			const res = await getUserBtcUtxosFromMaestro(paymentAddress)
      console.log('getUserBtcUtxosFromMaestro', res)
			const ocStatus = await ocActor.get_status()
			// const utxoFromMempool = await getAddressUtxo(paymentAddress) ?? []
			// const findUtxoHeightInMempool = (txid: string, vout: number) => {
			// 	const utxo = utxoFromMempool.find(e => e.txid === txid && e.vout === vout)
			// 	return utxo?.status.block_height
			// }
			let filteredUtxo = res
				.filter(
					(e) => !spentOutPointSet.has(`${e.txid}:${e.vout}`)
				)
				.filter(
					e => {
						// let block_height_from_mempool = findUtxoHeightInMempool(e.txid, e.vout)
						// if (block_height_from_mempool === undefined) return false
						return e.height <= (ocStatus.last_block?.[0]?.block_height ?? 0)
					}
				)
			console.log({ ocStatus, res, filteredUtxo})
			return filteredUtxo
		},
		refetchInterval: 30 * 1000 // Refetch every 15 s
	})
}

export function useBtcUtxos(address: string | undefined, pubkey?: string) {
  const [pendingUtxos] = usePendingBtcUtxos();
  const spentUtxos = useAtomValue(spentUtxosAtom);

  const { data: apiUtxos } = useSWR(
    address
      ? `https://api.omnity.network/api/utxos/btc?network=testnet&address=${address}${pubkey ? `&pubkey=${pubkey}` : ""}`
      : undefined,
    (url: string) =>
      axios.get<{ data?: UnspentOutput[]; error: string }>(url).then((res) => {
        if (res.data.error) {
          throw new Error(res.data.error);
        }
        return res.data.data;
      }),
    { refreshInterval: 5 * 1000 }
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
                  !p.runes.length &&
                  apiUtxos.findIndex(
                    (c) => c.txid === p.txid && c.vout === p.vout
                  ) < 0
              )
            )
        : undefined,
    [apiUtxos, pendingUtxos, spentUtxos]
  );
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
      ? `/api/utxos/rune?address=${address}&runeid=${runeid}${
          pubkey ? `&pubkey=${pubkey}` : ""
        }`
      : undefined,
    (url: string) => {
      return axios.get<{ data?: UnspentOutput[]; error: string }>(url).then((res) => {
        if (res.data.error) {
          throw new Error(res.data.error);
        }
        return res.data.data;
      })
    },
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

export function useWalletBtcUtxos() {
  const { address, paymentAddress, paymentPublicKey } = useLaserEyes();

  // console.log({
  //   address,
  //   paymentAddress,
  //   paymentPublicKey,
  // })

  const paymentUtxos = useBtcUtxos(paymentAddress, paymentPublicKey);

  return useMemo(() => paymentUtxos, [paymentUtxos]);
}

export function useWalletRuneUtxos(runeid: string | undefined) {
  const { address, publicKey } = useLaserEyes(({ address, publicKey }) => ({
    address,
    publicKey,
  }));

  const utxos = useRuneUtxos(address, runeid, publicKey);

  return useMemo(() => utxos, [utxos]);
}
