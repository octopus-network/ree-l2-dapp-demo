import { List } from "antd";
import { Game } from "../canister/cookie/service.did";
import { useGames } from "../hooks/use-pool";
import { useMemo } from "react";
import { game_status_str } from "../canister/cookie/actor";
import { Link } from "react-router-dom";

export function Home() {
  const { data: games, isLoading: isLoadingGames } = useGames();

  const loading = useMemo(() => {
    return isLoadingGames;
  }, [isLoadingGames]);

  return (
    <div>
      <button>Create Game</button>
      <List
        grid={{
          gutter: 16,
        }}
        dataSource={games}
        renderItem={(game: Game) => (
          <List.Item>
            <GameItem game={game} />
          </List.Item>
        )}
        loading={loading}
      />
    </div>
  );
}

function GameItem({ game }: { game: Game }) {
  return (
    <Link to={`/game/${game.game_id}`} className="w-full">
      <div className="border p-4 rounded-md shadow-md bg-white cursor-pointer hover:scale-103 transition-transform">
        <h3 className="text-lg font-semibold">{game.game_name}</h3>
        <p>Cookie Amount per Claim: {game.claim_amount_per_click}</p>
        <p>Claim Cooling Down: {game.claim_cooling_down} seconds</p>
        <p>Gamer Register Fee: {game.gamer_register_fee} sats</p>
        <p>Game Status: {game_status_str(game.game_status)}</p>
        <p>Creator: {game.creator_address}</p>
      </div>
    </Link>
  );
}