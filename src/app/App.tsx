import { useEffect, useRef, useState } from "react";
import { trackView } from "../core/analytics";
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

  // 화면(경로)이 바뀔 때만 집계한다. 크기나 시드만 바뀌는 이동은 세지 않는다
  const trackedPath = useRef<string | null>(null);
  useEffect(() => {
    const path = game ? route.path : route.path === "/" ? "/" : null;
    if (path === null || trackedPath.current === path) return;
    trackedPath.current = path;
    trackView(path, game ? game.title : "두뇌 퍼즐");
  }, [route.path, game]);

  return (
    <div className="app">
      <main className="app-main">
        {game ? <game.Screen params={route.params} navigate={navigate} /> : <Lobby games={games} navigate={navigate} />}
      </main>
      <footer className="app-footer">
        <p className="disclaimer" data-testid="disclaimer">
          비공식 팬 프로젝트입니다. 원 방송 및 제작사와 무관합니다.
        </p>
        <p className="disclaimer" data-testid="stats-note">
          방문 통계를 익명으로 수집합니다.
        </p>
      </footer>
    </div>
  );
}
