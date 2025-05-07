// import { UnspentOutput } from "@/types";

import { useMemo } from "react";

import { useAtomValue } from "jotai";
import { spentUtxosAtom } from "../store/spent-utxos";
import axios from "axios";

import useSWR from "swr";
import { useLaserEyes } from "@omnisat/lasereyes";
import { atom, useAtom } from "jotai";
import { UnspentOutput } from "../types";

export const pendingBtcUtxosAtom = atom<UnspentOutput[]>([]);
export const pendingRuneUtxosAtom = atom<UnspentOutput[]>([]);

export function usePendingBtcUtxos() {
  return useAtom(pendingBtcUtxosAtom);
}

export function usePendingRuneUtxos() {
  return useAtom(pendingRuneUtxosAtom);
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
