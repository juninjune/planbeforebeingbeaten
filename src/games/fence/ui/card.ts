import { edgeEnds } from "../engine/grid";
import { formatTime } from "../format";
import { orderLoop } from "./loop";

export interface CardData {
  size: number;
  clues: (number | null)[];
  /** 완성된 선의 변 번호 */
  solutionEdges: number[];
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

/** 판 배치: 점 (r, c)의 좌표는 (originX + c * cell, originY + r * cell) */
export function boardLayout(size: number): { cell: number; originX: number; originY: number; plate: typeof PLATE } {
  const inner = PLATE.w - PLATE_PAD * 2;
  const cell = inner / size;
  return { cell, originX: PLATE.x + PLATE_PAD, originY: PLATE.y + PLATE_PAD, plate: PLATE };
}

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

  // 판
  const { cell, originX, originY, plate } = boardLayout(data.size);
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

  const px = (p: number) => originX + (p % (data.size + 1)) * cell;
  const py = (p: number) => originY + Math.floor(p / (data.size + 1)) * cell;

  // 숫자는 흐리게
  ctx.fillStyle = "rgba(207,230,245,0.42)";
  ctx.font = `700 ${Math.round(cell * 0.46)}px ${FONT}`;
  data.clues.forEach((clue, i) => {
    if (clue === null) return;
    const r = Math.floor(i / data.size);
    const c = i % data.size;
    ctx.fillText(String(clue), originX + (c + 0.5) * cell, originY + (r + 0.5) * cell + cell * 0.03);
  });

  // 점
  ctx.fillStyle = "#5e7280";
  const dot = Math.max(3.5, cell * 0.06);
  for (let p = 0; p < (data.size + 1) * (data.size + 1); p++) {
    ctx.beginPath();
    ctx.arc(px(p), py(p), dot, 0, Math.PI * 2);
    ctx.fill();
  }

  // 고리: 얼음빛 흰색 + 글로우
  const order = orderLoop(data.size, data.solutionEdges);
  const path = new Path2D();
  if (order.length > 0) {
    order.forEach((p, i) => (i === 0 ? path.moveTo(px(p), py(p)) : path.lineTo(px(p), py(p))));
    path.closePath();
  } else {
    for (const e of data.solutionEdges) {
      const [a, b] = edgeEnds(data.size, e);
      path.moveTo(px(a), py(a));
      path.lineTo(px(b), py(b));
    }
  }
  const lw = Math.max(6, cell * 0.12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.save();
  ctx.shadowColor = "rgba(120,190,230,1)";
  ctx.shadowBlur = 36;
  ctx.strokeStyle = "#e8f4ff";
  ctx.lineWidth = lw;
  ctx.stroke(path);
  ctx.shadowBlur = 14;
  ctx.stroke(path);
  ctx.restore();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = lw * 0.55;
  ctx.stroke(path);

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
