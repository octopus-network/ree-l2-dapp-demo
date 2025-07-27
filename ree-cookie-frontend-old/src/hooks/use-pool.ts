import { useQuery } from "@tanstack/react-query";
import { cookieActor } from "../canister/cookie/actor";
import { Game } from "../canister/cookie/service.did";

export function useGames() {
    cookieActor.get_games_info()

    return useQuery<Game[]>({
        queryKey: ["games"],
        queryFn: async () => {
            const games = await cookieActor.get_games_info();
            return games;
        },
        refetchInterval: 60 * 1000, // Refetch every 60 seconds
    })

}

export function useGame( gameId: string) {

    return useQuery<Game>({
        queryKey: ["game", gameId],
        queryFn: async () => {
            const game = await cookieActor.get_game_info(BigInt(gameId));
            return game[0]!;
        },
        retry: false,
        refetchInterval: 60 * 1000, // Refetch every 60 seconds
    })

}
