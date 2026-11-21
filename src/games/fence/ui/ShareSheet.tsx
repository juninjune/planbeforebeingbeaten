import { useEffect, useRef, useState } from "react";
import { renderCard, type CardData } from "./card";

interface ShareSheetProps {
  card: CardData;
  url: string;
  text: string;
  onClose: () => void;
}

type Copied = "idle" | "true" | "manual";

export function ShareSheet({ card, url, text, onClose }: ShareSheetProps) {
  // 카드는 시트를 열 때 한 번만 만든다.
  // 화면 미리보기와 이미지 저장은 문제와 정답이 보이는 카드, 남에게 보내는 공유는 판을 가린 카드를 쓴다
  const [png] = useState(() => renderCard(card, "full").toDataURL("image/png"));
  const [sharePng] = useState(() => renderCard(card, "share").toDataURL("image/png"));
  const [copied, setCopied] = useState<Copied>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
      setCopied("true");
    } catch {
      const input = inputRef.current;
      input?.focus();
      input?.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      setCopied(ok ? "true" : "manual");
    }
  };

  const nativeShare = async () => {
    try {
      const blob = await (await fetch(sharePng)).blob();
      const file = new File([blob], `울타리치기-${card.size}x${card.size}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, url });
      } else {
        await navigator.share({ text, url });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      try {
        await navigator.share({ text, url });
      } catch {
        // 공유 창을 쓸 수 없으면 링크 복사와 이미지 저장을 쓰면 된다
      }
    }
  };

  return (
    <div className="rules-backdrop">
      <div className="rules-sheet share-sheet" data-testid="share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="share-head">
          <h2 id="share-title">공유</h2>
          <button ref={closeRef} type="button" data-testid="share-close" onClick={onClose}>
            닫기
          </button>
        </div>
        <img className="share-card" data-testid="result-card" src={png} alt="결과 카드" />
        <img data-testid="share-card-safe" src={sharePng} alt="" hidden />
        <p className="share-note" data-testid="share-note">
          공유하면 정답을 가린 카드가 전송됩니다. 이미지 저장은 정답이 보이는 카드입니다.
        </p>
        <input
          ref={inputRef}
          className="share-url"
          data-testid="share-url"
          readOnly
          value={url}
          aria-label="도전장 링크"
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
        />
        <div className="share-buttons">
          <button type="button" data-testid="copy-link" data-copied={copied === "idle" ? undefined : copied} onClick={copyLink}>
            {copied === "true" ? "복사됨" : "링크 복사"}
          </button>
          <a className="share-save" data-testid="save-card" download={`울타리치기-${card.size}x${card.size}.png`} href={png}>
            이미지 저장
          </a>
          {canNativeShare && (
            <button type="button" data-testid="share-native" onClick={nativeShare}>
              공유하기
            </button>
          )}
        </div>
        {copied === "manual" && <p className="share-note">길게 눌러 복사하세요</p>}
      </div>
    </div>
  );
}
