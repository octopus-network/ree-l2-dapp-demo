export interface Coin {
	id: string
	icon?: string
	symbol?: string
	name: string
	runeId?: string
	runeSymbol?: string
	etching?: string
	decimals: number
	number?: number
}

export type CoinWithBalance = Coin & {
	balance: string
}

export enum Field {
	INPUT = 'INPUT',
	OUTPUT = 'OUTPUT'
}

export interface CoinBalance {
	id: string
	value: bigint
}
