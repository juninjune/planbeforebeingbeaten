export interface Hit {
  path: string;
  title?: string;
  event?: boolean;
  referrer?: string;
  screenWidth?: number;
}

export const COUNT_ENDPOINT = "https://pinballz.goatcounter.com/count";
const ALLOWED_HOST = "puzzle.pinballz.kr";

/** GoatCounter 집계 주소. 쿼리는 p, t, e, r, s, b, rnd */
export function buildCountUrl(endpoint: string, hit: Hit, rnd: string): string {
  const q = new URLSearchParams();
  q.set("p", hit.path);
  if (hit.title !== undefined) q.set("t", hit.title);
  if (hit.event) q.set("e", "true");
  if (hit.referrer) q.set("r", hit.referrer);
  if (hit.screenWidth !== undefined) q.set("s", String(hit.screenWidth));
  q.set("b", "0");
  q.set("rnd", rnd);
  return `${endpoint}?${q}`;
}

/** 집계 여부. 배포 빌드이고 호스트가 puzzle.pinballz.kr 이며 skipgc가 아닐 때만 참 */
export function isEnabled(env: { prod: boolean; hostname: string; skip: boolean }): boolean {
  return env.prod && env.hostname === ALLOWED_HOST && !env.skip;
}

export interface SendDeps {
  /** 없을 수 있다 */
  beacon?: (url: string) => boolean;
  image: (url: string) => void;
}

/** sendBeacon을 먼저 쓰고, 없거나 실패하면 이미지 요청으로 보낸다. 절대 예외를 던지지 않는다 */
export function sendHit(url: string, deps: SendDeps): void {
  try {
    let ok = false;
    try {
      ok = deps.beacon ? deps.beacon(url) : false;
    } catch {
      ok = false;
    }
    if (!ok) deps.image(url);
  } catch {
    // 집계 실패는 게임에 영향을 주지 않는다
  }
}

/** 비활성이면 전송 함수를 부르지 않는다 */
export function dispatchHit(
  hit: Hit,
  env: { prod: boolean; hostname: string; skip: boolean },
  deps: SendDeps,
  rnd: string,
): void {
  try {
    if (!isEnabled(env)) return;
    sendHit(buildCountUrl(COUNT_ENDPOINT, hit, rnd), deps);
  } catch {
    // 무시
  }
}

function readEnv(): { prod: boolean; hostname: string; skip: boolean } {
  let skip = false;
  try {
    skip = window.localStorage.getItem("skipgc") === "t";
  } catch {
    skip = false;
  }
  return { prod: import.meta.env.PROD, hostname: window.location.hostname, skip };
}

function realDeps(): SendDeps {
  return {
    beacon: typeof navigator.sendBeacon === "function" ? (u) => navigator.sendBeacon(u) : undefined,
    image: (u) => {
      new Image().src = u;
    },
  };
}

function track(hit: Hit): void {
  try {
    if (import.meta.env.DEV) {
      // 개발 빌드는 전송하지 않고 확인용으로 쌓는다
      const w = window as unknown as { __hits?: { path: string; event: boolean }[] };
      (w.__hits ??= []).push({ path: hit.path, event: !!hit.event });
      return;
    }
    dispatchHit(hit, readEnv(), realDeps(), Math.random().toString(36).slice(2, 8));
  } catch {
    // 무시
  }
}

/** 화면 이동 집계. 절대 예외를 던지지 않는다 */
export function trackView(path: string, title: string): void {
  try {
    track({ path, title, referrer: document.referrer, screenWidth: window.screen.width });
  } catch {
    // 무시
  }
}

/** 이벤트 집계. 절대 예외를 던지지 않는다 */
export function trackEvent(name: string): void {
  try {
    track({ path: name, title: name, event: true, screenWidth: window.screen.width });
  } catch {
    // 무시
  }
}
