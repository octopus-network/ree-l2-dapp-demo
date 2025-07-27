import axios from 'axios'
import type { UnspentOutput } from 'types'
import { getAddressType } from 'utils'

const unisatOpenApi = axios.create({
	baseURL: import.meta.env.VITE_UNISAT_OPEN_API_URL,
	headers: {
		'Content-Type': 'application/json'
		// "Authorization:":
		//   "3262ea26c68b0b364f62f78213a4850f6340c32127ea2a8bcdd8bf3ed5e67834",
	}
})

export function inscriptionImgUrlFromUnisat(inscriptionId: string) {
	return `${import.meta.env.VITE_UNISAT_OPEN_API_URL}/v1/indexer/inscription/content/${inscriptionId}`
}

export async function getInscriptionImg(inscriptionId: string) {
	return unisatOpenApi
		.get<Blob>(`/v1/indexer/inscription/content/${inscriptionId}`)
		.then(e => {
			if (e.status !== 200) {
				throw new Error(`Failed to getInscriptionImg ${e}`)
			}
			return e.data
		})
}

export async function getUtxoData(
	address: string
): Promise<UnisatApiResponse<GetUtxoData>> {
	return unisatOpenApi
		.get<
			UnisatApiResponse<GetUtxoData>
		>(`/v1/indexer/address/${address}/utxo-data?cursor=0&size=100`)
		.then(e => {
			if (e.data.code !== 0) {
				throw new Error(`Failed to getUtxoData ${e}`)
			}
			if (e.data.data.total > 500) {
				throw new Error('too many utxos')
			}
			return e.data
		})
}

export async function getRuneUtxo(
	address: string,
	runeId: string
): Promise<UnisatApiResponse<GetRuneUtxoData>> {
	const [runeBlock, runeIndex] = runeId.split(':')
	return unisatOpenApi
		.get<
			UnisatApiResponse<GetRuneUtxoData>
		>(`/v1/indexer/address/${address}/runes/${runeBlock}%3A${runeIndex}/utxo?start=0&limit=20`)
		.then(e => {
			if (e.data.code != 0) {
				throw new Error(`Failed to getRuneUtxo ${e}`)
			}
			if (e.data.data.total > 20) {
				throw new Error('getRuneUtxo too many utxos')
			}
			return e.data
		})
}

export async function getFirst200InscriptionList(address: string): Promise<UnisatInscriptionItem[]> {
	return unisatOpenApi
		.get<
			UnisatApiResponse<GetInscriptionListData>
		>(`/v1/indexer/address/${address}/inscription-data?cursor=${0}&size=${200}`)
		.then(e => {
			if (e.data.msg !== 'ok') {
				throw new Error(e.data.msg)
			}
			if (e.data.data.total > 200) {
				throw new Error('getFirst200InscriptionList too many inscriptions')
			}
			return e.data.data.inscription
		})
}

export async function getInscriptionList(
	address: string,
	cursor: number,
	size: number
): Promise<UnisatApiResponse<GetInscriptionListData>> {

	return unisatOpenApi
		.get<
			UnisatApiResponse<GetInscriptionListData>
		>(`/v1/indexer/address/${address}/inscription-data?cursor=${cursor}&size=${size}`)
		.then(e => {
			if (e.data.msg !== 'ok') {
				throw new Error(e.data.msg)
			}
			return e.data
		})
}

export interface UnisatApiResponse<T> {
	code: number
	msg: string | undefined
	data: T
}

export interface GetRuneUtxoData {
	height: number
	start: number
	total: number
	utxo: UnisatRuneUtxo[]
}

export interface GetUtxoData {
	cursor: number
	total: number
	totalConfirmed: number
	totalUnconfirmed: number
	totalUnconfirmedSpend: number
	totalRunes: number | undefined
	utxo: UnisatUtxo[]
}

export interface GetInscriptionListData {
	cursor: number
	total: number
	totalConfirmed: number
	totalUnconfirmed: number
	totalUnconfirmedSpend: number
	inscription: UnisatInscriptionItem[]
}

export interface UnisatInscriptionItem {
	utxo: UnisatUtxo
	address: string
	offset: number
	inscriptionIndex: number
	inscriptionNumber: number
	inscriptionId: string
	isStrip: boolean
	hasPointer: boolean
	hasParent: boolean
	hasDeligate: boolean
	hasMetaProtocal: boolean
	hasMetadata: boolean
	hasContentEncoding: boolean
	pointer: number
	parent: string
	deligate: string
	metaprotocol: string
	metadata: string
	contentEncoding: string
	contentType: string
	contentLength: number
	contentBody: string
	height: number
	idxInBlock: number
	timestamp: number
	inSatoshi: number
	outSatoshi: number
}

export interface UnisatUtxo {
	txid: string
	vout: number
	satoshi: number
	scriptType: string
	scriptPk: string
	codeType: number
	address: string
	height: number
	idx: number
	isOpInRBF: boolean
	isSpent: boolean
	inscriptionsCount: number
	inscriptions: UnisatInscription[]
}

export function convertUnisatUtxo(
	utxo: UnisatUtxo,
	pubkey: string
): UnspentOutput {
	return {
		txid: utxo.txid,
		vout: utxo.vout,
		satoshis: utxo.satoshi.toString(),
		scriptPk: utxo.scriptPk,
		pubkey,
		addressType: getAddressType(utxo.address),
		address: utxo.address,
		runes: [] 
	}
}

export interface UnisatRuneUtxo {
	height: number
	confirmations: number
	address: string
	satoshi: number
	scriptPk: string
	txid: string
	vout: number
	runes: UnisatRune[]
}

export function convertUnisatRuneUtxo(
	utxo: UnisatRuneUtxo,
	pubkey: string
): UnspentOutput {
	return {
		txid: utxo.txid,
		vout: utxo.vout,
		satoshis: utxo.satoshi.toString(),
		scriptPk: utxo.scriptPk,
		pubkey,
		addressType: getAddressType(utxo.address),
		address: utxo.address,
		runes: utxo.runes.map(rune => ({
			id: rune.runeid,
			amount: rune.amount
		}))
		// {
		//   id: string;
		//   amount: string;
		// }[];
	}
}

export interface UnisatRune {
	rune: string
	runeid: string
	spacedRune: string
	amount: string
	symbol: string
	divisibility: number
}

export interface UnisatInscription {
	inscriptionNumber: number
	inscriptionId: string
	offset: number
	isStrip: boolean
	moved: boolean
	sequence: number
	isCursed: boolean
	isVindicate: boolean
	isBRC20Tran: boolean
	isBRC20Mint: boolean
	isBRC20Ext: boolean
	isBRC20: boolean
	contentType: string
}

export async function getRunesInfoByUnisat(
	runeId: string
): Promise<UnisatRuneInfoData> {
	const [runeBlock, runeIndex] = runeId.split(':')
	return unisatOpenApi
		.get<
			UnisatApiResponse<UnisatRuneInfoData>
		>(`/v1/indexer/runes/${runeBlock}%3A${runeIndex}/info`)
		.then(e => {
			if (e.data.code !== 0) {
				throw new Error(`Failed to getRunesInfo ${e}`)
			}
			return e.data.data
		})
}

export interface UnisatRuneInfoData {
	runeId: string
	rune: string
	spacedRune: string
	number: number
	height: number
	txidx: number
	timestamp: number
	divisibility: number
	symbol: string
	etching: string
	premine: string
	mints: string
	burned: string
	holders: number
	transactions: number
	supply: string
	start: number | null
	end: number | null
	mintable: boolean
	remaining: string
	anHourMints: number
	sixHourMints: number
	oneDayMints: number
	sevenDayMints: number
	progress: number
}
