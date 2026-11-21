import { describe, expect, it, vi } from "vitest";
import { buildCountUrl, dispatchHit, isEnabled, sendHit } from "./analytics";

const EP = "https://pinballz.goatcounter.com/count";
const PROD = { prod: true, hostname: "puzzle.pinballz.kr", skip: false };

describe("buildCountUrl", () => {
  it("화면 이동: p, t, r, s, b, rnd가 들어가고 e는 없다", () => {
    const u = new URL(buildCountUrl(EP, { path: "/fence", title: "울타리 치기", referrer: "https://example.com/", screenWidth: 390 }, "abc"));
    expect(u.origin + u.pathname).toBe(EP);
    expect(u.searchParams.get("p")).toBe("/fence");
    expect(u.searchParams.get("t")).toBe("울타리 치기");
    expect(u.searchParams.get("r")).toBe("https://example.com/");
    expect(u.searchParams.get("s")).toBe("390");
    expect(u.searchParams.get("b")).toBe("0");
    expect(u.searchParams.get("rnd")).toBe("abc");
    expect(u.searchParams.has("e")).toBe(false);
  });

  it("이벤트이면 e=true", () => {
    const u = new URL(buildCountUrl(EP, { path: "fence/start/7", title: "fence/start/7", event: true }, "x"));
    expect(u.searchParams.get("e")).toBe("true");
    expect(u.searchParams.has("r")).toBe(false);
  });

  it("리퍼러가 비어 있으면 r을 생략한다", () => {
    expect(new URL(buildCountUrl(EP, { path: "/", referrer: "" }, "x")).searchParams.has("r")).toBe(false);
    expect(new URL(buildCountUrl(EP, { path: "/" }, "x")).searchParams.has("r")).toBe(false);
  });

  it("한글 제목은 퍼센트 인코딩된다", () => {
    const url = buildCountUrl(EP, { path: "/", title: "두뇌 퍼즐" }, "x");
    expect(url).not.toContain("두뇌");
    expect(url).toContain("t=%EB%91%90%EB%87%8C");
    expect(new URL(url).searchParams.get("t")).toBe("두뇌 퍼즐");
  });

  it("q(쿼리 문자열)는 보내지 않는다", () => {
    expect(new URL(buildCountUrl(EP, { path: "/fence" }, "x")).searchParams.has("q")).toBe(false);
  });
});

describe("isEnabled", () => {
  it("배포 빌드, 배포 호스트, skip 아님일 때만 참", () => {
    expect(isEnabled(PROD)).toBe(true);
    expect(isEnabled({ ...PROD, hostname: "localhost" })).toBe(false);
    expect(isEnabled({ ...PROD, hostname: "example.com" })).toBe(false);
    expect(isEnabled({ ...PROD, hostname: "evil-puzzle.pinballz.kr" })).toBe(false);
    expect(isEnabled({ ...PROD, prod: false })).toBe(false);
    expect(isEnabled({ ...PROD, skip: true })).toBe(false);
    expect(isEnabled({ prod: false, hostname: "localhost", skip: true })).toBe(false);
  });
});

describe("sendHit", () => {
  it("beacon이 true면 이미지는 쓰지 않는다", () => {
    const beacon = vi.fn(() => true);
    const image = vi.fn();
    sendHit("u", { beacon, image });
    expect(beacon).toHaveBeenCalledWith("u");
    expect(image).not.toHaveBeenCalled();
  });

  it("beacon이 false를 돌려주면 이미지로 넘어간다", () => {
    const image = vi.fn();
    sendHit("u", { beacon: () => false, image });
    expect(image).toHaveBeenCalledWith("u");
  });

  it("beacon이 없으면 이미지로 보낸다", () => {
    const image = vi.fn();
    sendHit("u", { image });
    expect(image).toHaveBeenCalledOnce();
  });

  it("beacon이 예외를 던져도 밖으로 나가지 않고 이미지로 넘어간다", () => {
    const image = vi.fn();
    expect(() =>
      sendHit("u", {
        beacon: () => {
          throw new Error("boom");
        },
        image,
      }),
    ).not.toThrow();
    expect(image).toHaveBeenCalledOnce();
  });

  it("이미지 생성이 예외를 던져도 밖으로 나가지 않는다", () => {
    const boom = () => {
      throw new Error("boom");
    };
    expect(() => sendHit("u", { beacon: boom, image: boom })).not.toThrow();
    expect(() => sendHit("u", { beacon: () => false, image: boom })).not.toThrow();
  });
});

describe("dispatchHit", () => {
  const deps = () => ({ beacon: vi.fn(() => true), image: vi.fn() });

  it("활성이면 만든 주소로 한 번 보낸다", () => {
    const d = deps();
    dispatchHit({ path: "/", title: "두뇌 퍼즐" }, PROD, d, "r1");
    expect(d.beacon).toHaveBeenCalledOnce();
    const sent = new URL((d.beacon.mock.calls[0] as unknown as [string])[0]);
    expect(sent.searchParams.get("p")).toBe("/");
    expect(sent.searchParams.get("rnd")).toBe("r1");
  });

  it("비활성이면 전송 함수를 한 번도 부르지 않는다", () => {
    for (const env of [
      { ...PROD, hostname: "localhost" },
      { ...PROD, prod: false },
      { ...PROD, skip: true },
    ]) {
      const d = deps();
      dispatchHit({ path: "/" }, env, d, "r");
      expect(d.beacon).not.toHaveBeenCalled();
      expect(d.image).not.toHaveBeenCalled();
    }
  });
});
