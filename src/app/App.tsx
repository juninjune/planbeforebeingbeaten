import { useEffect, useState } from "react";
import { games } from "../games";
import { Lobby } from "./Lobby";
import { navigate, parseHash } from "./route";

export function App() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const game = games.find((g) => `/${g.id}` === route.path);

  // 등록되지 않은 주소는 로비로 보낸다
  useEffect(() => {
    if (route.path !== "/" && !game) navigate("/");
  }, [route.path, game]);

  return (
    <div className="app">
      <main className="app-main">
        {game ? <game.Screen params={route.params} navigate={navigate} /> : <Lobby games={games} navigate={navigate} />}
      </main>
      <footer className="disclaimer" data-testid="disclaimer">
        비공식 팬 프로젝트입니다. 원 방송 및 제작사와 무관합니다.
      </footer>
    </div>
  );
}
