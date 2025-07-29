import axios from "axios"
import { UnspentOutput } from "types"
import { getAddressType } from "utils"

const maestroApi = axios.create({
    baseURL: import.meta.env.VITE_MAESTRO_API_URL!,
    headers: {
        'Content-Type': 'application/json',
        'api-key': import.meta.env.VITE_MAESTRO_API_KEY!
    }
})

export type MaestroUtxoResponse = {
    data: MaestroUtxo[]
}

export type MaestroUtxo = {
    txid: string,
    vout: number,
    address: string,
    script_pubkey: string,
    satoshis: string,
    confirmations: number,
    height: number,
    runes: MaestroRune[],
    inscriptions: any[],
}

export type MaestroRune = {
    rune_id: string,
    amount: string // eg: 0.002400
}

export async function getUserBtcUtxosFromMaestro(
    address: string,
) {
    return maestroApi
        .get<MaestroUtxoResponse>(`/addresses/${address}/utxos?filter_dust=true`)
        .then(res => {
            if (res.status !== 200) {
                throw new Error(`Failed to getUserBtcUtxos ${res.statusText}`);
            }
            return res.data.data.filter(utxo => utxo.runes.length === 0 && utxo.inscriptions.length === 0);
        });
}

export async function getUserRuneUtxosFromMaestro(
    address: string,
    runeid?: string
): Promise<MaestroUtxo[]> {
    return maestroApi
        .get<MaestroUtxoResponse>(`/addresses/${address}/utxos`)
        .then(res => {
            console.log('getUserRuneUtxosFromMaestro', res.data);
            if (res.status !== 200) {
                throw new Error(`Failed to getUserRuneUtxos ${res.statusText}`);
            }
            return res.data.data.filter(utxo => !runeid || utxo.runes.some(rune => rune.rune_id === runeid))
        }).catch(e=>{
            console.error('getUserRuneUtxosFromMaestro error', e);
            throw e;
        })
}

export function convertMaestroUtxo(
    utxo: MaestroUtxo,
    pubkey: string
): UnspentOutput {
    return {
        txid: utxo.txid,
        vout: utxo.vout,
        satoshis: BigInt(utxo.satoshis),
        scriptPk: utxo.script_pubkey,
        pubkey,
        addressType: getAddressType(utxo.address),
        address: utxo.address,
        runes: utxo.runes.map(rune => ({
            id: rune.rune_id,
            amount: rune.amount
        })),
    };
}