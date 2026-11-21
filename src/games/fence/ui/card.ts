import { formatTime } from "../format";

export interface CardData {
  size: number;
  ms: number;
  hints: number;
  /** 오늘의 판이면 "오늘의 판 · 11월 22일", 아니면 null */
  dailyLabel: string | null;
  title: string;
}

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';
const PLATE = { x: 140, y: 250, w: 800 };
const PLATE_PAD = 40;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 결과 카드(1080x1350)를 캔버스에 그린다. 자체 제작 그래픽만 쓴다 */
export function renderCard(data: CardData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 어두운 무대: 방사형 조명과 비네트
  ctx.fillStyle = "#07090c";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const light = ctx.createRadialGradient(540, 620, 0, 540, 620, 760);
  light.addColorStop(0, "rgba(120,190,230,0.30)");
  light.addColorStop(0.55, "rgba(120,190,230,0.08)");
  light.addColorStop(1, "rgba(120,190,230,0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const vignette = ctx.createRadialGradient(540, 640, 420, 540, 640, 980);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 제목
  ctx.fillStyle = "#e8f4ff";
  ctx.font = `700 68px ${FONT}`;
  ctx.fillText(`${data.title} ${data.size}x${data.size}`, 540, 120);
  if (data.dailyLabel) {
    ctx.fillStyle = "#4fd1c5";
    ctx.font = `600 40px ${FONT}`;
    ctx.fillText(data.dailyLabel, 540, 195);
  }

  // 판: 문제와 정답은 싣지 않는다. 모든 카드가 같은 흐릿한 고리 그림을 쓴다
  const plate = PLATE;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  roundRect(ctx, plate.x, plate.y, plate.w, plate.w, 36);
  ctx.fillStyle = "#0a1016";
  ctx.fill();
  ctx.restore();
  roundRect(ctx, plate.x, plate.y, plate.w, plate.w, 36);
  ctx.strokeStyle = "rgba(150,200,235,0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 고정된 장식용 고리. 실제 판과 무관하다
  const g = (plate.w - PLATE_PAD * 4) / 5;
  const ox = plate.x + PLATE_PAD * 2;
  const oy = plate.y + PLATE_PAD * 2;
  const loop: [number, number][] = [[0, 0], [3, 0], [3, 1], [5, 1], [5, 4], [4, 4], [4, 5], [1, 5], [1, 3], [0, 3]];
  // 도형을 캔버스 밖에 그리고 그림자만 안으로 떨어뜨려 흐릿한 상만 남긴다
  const FAR = 4000;
  const path = new Path2D();
  loop.forEach(([c, r], i) => {
    const x = ox + c * g - FAR;
    const y = oy + r * g;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();
  ctx.save();
  roundRect(ctx, plate.x, plate.y, plate.w, plate.w, 36);
  ctx.clip();
  ctx.lineJoin = "round";
  ctx.shadowOffsetX = FAR;
  ctx.strokeStyle = "#000";
  ctx.shadowColor = "rgba(120,190,230,0.55)";
  ctx.shadowBlur = 90;
  ctx.lineWidth = 46;
  ctx.stroke(path);
  ctx.shadowColor = "rgba(232,244,255,0.9)";
  ctx.shadowBlur = 34;
  ctx.lineWidth = 22;
  ctx.stroke(path);
  ctx.restore();

  // 기록
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(120,190,230,0.9)";
  ctx.shadowBlur = 30;
  ctx.font = `800 150px ${FONT}`;
  ctx.fillText(formatTime(data.ms), 540, 1140);
  ctx.restore();
  ctx.fillStyle = data.hints === 0 ? "#4fd1c5" : "#9fb0bd";
  ctx.font = `600 42px ${FONT}`;
  ctx.fillText(data.hints === 0 ? "힌트 없음" : `힌트 ${data.hints}회`, 540, 1235);

  // 서비스 이름과 주소
  ctx.fillStyle = "#7b8a96";
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText("두뇌 퍼즐 · puzzle.pinballz.kr", 540, 1300);

  return canvas;
}
