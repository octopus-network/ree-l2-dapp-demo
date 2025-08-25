import { useQuery } from "@tanstack/react-query";
import { cookieActor } from "../canister/cookie/actor";
import type { Game, GameAndPool } from "../canister/cookie/service.did";
import { etchActor } from "canister/etching/actor";

export function useGames() {

    return useQuery<GameAndPool[]>({
        queryKey: ["games"],
        queryFn: async () => {
            const games = await cookieActor.get_games_info();
            return games;
        },
        refetchInterval: 60 * 1000, // Refetch every 60 seconds
    })

}

export function useGame( gameId: string) {

    return useQuery<GameAndPool>({
        queryKey: ["game", gameId],
        queryFn: async () => {
            const game = await cookieActor.get_game_info(gameId);
            return game[0]!;
        },
        retry: false,
        refetchInterval: 60 * 1000, // Refetch every 60 seconds
    })

}

export function useEtchingRequest(commitTxid: string | undefined) {
    return useQuery({
        queryKey: ["etching-result", commitTxid],
        queryFn: async () => {
            if (!commitTxid) {
                return undefined;
            }
            const res = await etchActor.get_etching_request(commitTxid!);
            return res;
        },
        enabled: !!commitTxid,
        refetchInterval: 60 * 1000, // Refetch every 60 seconds
    })

}
 
