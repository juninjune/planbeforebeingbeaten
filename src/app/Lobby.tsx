import type { GameDefinition } from "../core/game";

interface LobbyProps {
  games: GameDefinition[];
  navigate: (path: string, params?: Record<string, string>) => void;
}

export function Lobby({ games, navigate }: LobbyProps) {
  return (
    <section className="lobby" data-testid="lobby">
      <h1>두뇌 퍼즐</h1>
      <ul className="lobby-list">
        {games.map((g) => (
          <li key={g.id}>
            <button type="button" className="lobby-game" data-testid={`game-${g.id}`} onClick={() => navigate(`/${g.id}`)}>
              {g.Preview && <g.Preview />}
              <span className="lobby-game-text">
                <strong>{g.title}</strong>
                <span>{g.tagline}</span>
              </span>
            </button>
            {g.LobbyExtra && <g.LobbyExtra navigate={navigate} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
