// aside repl용 스크립트. run.sh가 자리표시자를 치환해서 실행한다.
const BASE_URL = '__BASE_URL__';
const QUERY = '__QUERY__';
const LABEL = '__LABEL__';

const fail = (msg) => { throw new Error(msg); };
const check = (cond, msg) => { if (!cond) fail(msg); };

const e2eMain = async () => {
  const page = await openTab(BASE_URL + '/#/');
  try {
    await page.setViewportSize({ width: 390, height: 844 });

    const waitUntil = async (fn, what) => {
      for (let i = 0; i < 80; i++) {
        if (await fn()) return;
        await sleep(100);
      }
      fail(what);
    };
    const attr = (sel, name) => page.evaluate(([s, n]) => { const el = document.querySelector(s); return el ? el.getAttribute(n) : null; }, [sel, name]);
    const q = new URLSearchParams(QUERY);
    const wantSeed = q.get('seed');
    const wantSize = wantSeed === 'fixed' ? '5' : (q.get('size') || '7');

    // 로비 -> 게임 진입. size, seed가 없으면 기본 7x7이고 주소에 seed가 채워진다
    await page.waitForSelector('[data-testid="lobby"]', { timeout: 10000 }).catch(() => fail('로비가 보이지 않음'));
    check(await page.locator('[data-testid="disclaimer"]').count() === 1, '로비에 고지가 없음');
    await page.locator('[data-testid="game-fence"]').click();
    await page.waitForSelector('[data-testid="fence-screen"]', { timeout: 10000 }).catch(() => fail('게임 화면이 열리지 않음'));
    check(await attr('[data-testid="fence-screen"]', 'data-size') === '7', '기본 크기가 7이 아님');
    const filledHash = await page.evaluate(() => window.location.hash);
    check(/seed=[a-z0-9]{6,8}$/.test(filledHash) && filledHash.includes('size=7'), '주소에 seed가 채워지지 않음: ' + filledHash);

    // 크기 선택 버튼: 시나리오와 다른 크기를 눌러 화면이 바뀌는지 확인
    const other = wantSize === '10' ? '5' : '10';
    await page.locator('[data-testid="size-' + other + '"]').click();
    await waitUntil(async () => await attr('[data-testid="fence-screen"]', 'data-size') === other, '크기 버튼을 눌러도 data-size가 바뀌지 않음');
    check((await page.evaluate(() => window.location.hash)).includes('size=' + other), '크기 버튼이 주소에 반영되지 않음');

    // 시나리오 주소로 이동
    await page.evaluate((qq) => { window.location.hash = '#/fence?' + qq; }, QUERY);
    await waitUntil(async () => await attr('[data-testid="fence-screen"]', 'data-seed') === wantSeed, '시나리오 주소의 seed로 판이 열리지 않음');
    check(await attr('[data-testid="fence-screen"]', 'data-size') === wantSize, 'data-size 불일치');
    await page.waitForSelector('[data-testid="board"]', { timeout: 10000 }).catch(() => fail('보드가 보이지 않음'));
    check(await page.locator('[data-testid="complete"]').count() === 0, '시작부터 완성 화면이 있음');

    // 판 전체가 화면 안에 있음
    const boardIn = await page.evaluate(() => { const b = document.querySelector('[data-testid="board"]').getBoundingClientRect(); return b.left >= 0 && b.top >= 0 && b.right <= window.innerWidth && b.bottom <= window.innerHeight; });
    check(boardIn, '판이 화면 안에 다 들어오지 않음');

    const info = await page.evaluate(() => window.__fence || null);
    check(info && Array.isArray(info.solution), 'window.__fence 훅이 없음');
    const { size, clues, solution } = info;
    check(String(size) === wantSize, '훅의 size 불일치');

    // 같은 주소를 다시 열면 같은 판(clues)이 나온다
    const page2 = await openTab(BASE_URL + '/#/fence?' + QUERY);
    try {
      await page2.waitForSelector('[data-testid="board"]', { timeout: 10000 });
      const info2 = await page2.evaluate(() => window.__fence || null);
      check(info2 && JSON.stringify(info2.clues) === JSON.stringify(clues), '같은 주소인데 clues가 다름');
    } finally {
      await closeTab(page2);
    }

    // 변 터치 영역의 중심 좌표(꼭짓점 bbox 중심 = 변의 중점)
    const centers = async () => page.evaluate(() => {
      const out = {};
      document.querySelectorAll('[data-edge]').forEach((el) => {
        const b = el.getBoundingClientRect();
        out[el.getAttribute('data-edge')] = [b.left + b.width / 2, b.top + b.height / 2];
      });
      return out;
    });
    const markOf = (e) => page.evaluate((i) => document.querySelector('[data-edge="' + i + '"]').getAttribute('data-mark'), e);
    const press = async (edges) => {
      const c = await centers();
      for (const e of edges) {
        check(c[e], '변 ' + e + ' 영역이 없음');
        await page.mouse.click(c[e][0], c[e][1]);
      }
    };
    const completeCount = () => page.locator('[data-testid="complete"]').count();
    const solvedAttr = () => page.evaluate(() => document.querySelector('[data-testid="fence-screen"]').getAttribute('data-solved'));

    const shot = async (name) => {
      const rel = './artifacts/' + LABEL + '-' + name + '.png';
      await page.screenshot({ path: rel });
      console.log('SHOT ' + LABEL + '-' + name + ' ' + path.resolve(rel));
      // 일회성 세션 폴더는 종료 후 지워지므로 이미지를 base64로도 내보낸다
      const data = await fs.readFile(rel);
      console.log('SHOTDATA ' + LABEL + '-' + name + ' ' + Buffer.from(data).toString('base64'));
    };
    await shot('start');

    // 되돌리기와 전체 지우기
    const dataMarks = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-edge]')).map((el) => el.getAttribute('data-mark')));
    const [u1, u2] = solution;
    await press([u1, u2]);
    check(await markOf(u1) === '1' && await markOf(u2) === '1', '되돌리기 준비: 두 변이 선이 되지 않음');
    await page.locator('[data-testid="undo"]').click();
    check(await markOf(u2) === '0' && await markOf(u1) === '1', '되돌리기 한 번이 마지막 변만 복원하지 않음');
    await page.locator('[data-testid="clear"]').click();
    check((await dataMarks()).every((m) => m === '0'), '전체 지우기 뒤에 data-mark가 모두 0이 아님');

    // 오답 1: 숫자가 있는 칸 하나의 네 변을 모두 선으로 -> 닫힌 고리지만 숫자 불일치
    const cellIdx = clues.findIndex((v) => v !== null && v !== 4);
    check(cellIdx >= 0, '숫자 칸이 없음');
    const r = Math.floor(cellIdx / size), c = cellIdx % size;
    const hCount = size * (size + 1);
    const ring = [r * size + c, (r + 1) * size + c, hCount + r * (size + 1) + c, hCount + r * (size + 1) + c + 1];
    await press(ring);
    for (const e of ring) check(await markOf(e) === '1', '오답1: 변 ' + e + '이 선이 되지 않음');
    check(await completeCount() === 0, '오답1: 숫자가 틀린 고리에서 완성 화면이 나옴');
    check(await solvedAttr() === 'false', '오답1: data-solved가 true');
    await press([...ring, ...ring]);
    for (const e of ring) check(await markOf(e) === '0', '오답1: 변 ' + e + '이 빈 변으로 돌아오지 않음');

    // 오답 2: 정답에서 마지막 변만 빼고 누름
    const last = solution[solution.length - 1];
    await press(solution.slice(0, -1));
    check(await completeCount() === 0, '오답2: 고리 미완성인데 완성 화면이 나옴');
    check(await solvedAttr() === 'false', '오답2: data-solved가 true');

    // 마지막 변
    await press([last]);
    await page.waitForSelector('[data-testid="complete"]', { timeout: 5000 }).catch(() => fail('정답을 모두 눌렀는데 완성 화면이 나오지 않음'));
    const stateNow = await page.evaluate(() => Array.from(document.querySelectorAll('[data-clue-state]')).map((el) => el.getAttribute('data-clue-state')));
    check(stateNow.length === clues.filter((v) => v !== null).length, 'data-clue-state 개수가 숫자 칸 수와 다름');
    check(stateNow.every((v) => v === 'met'), '정답 상태에서 모든 숫자 칸이 met이 아님');
    check(await solvedAttr() === 'true', '완성 후 data-solved가 true가 아님');
    const rec = (await page.locator('[data-testid="record-time"]').textContent() || '').trim();
    check(/^\d+:\d{2}\.\d{2}$/.test(rec), '기록 시간 형식 불일치: ' + rec);
    await sleep(2200); // 완성 연출이 끝나길 기다린다
    const completeIn = await page.evaluate(() => { const b = document.querySelector('[data-testid="complete"]').getBoundingClientRect(); return b.bottom <= window.innerHeight; });
    check(completeIn, '완성 화면이 한 화면 안에 보이지 않음');
    await shot('complete');

    // 완성 후 입력 무시
    const before = await page.evaluate(() => {
      const o = {};
      document.querySelectorAll('[data-edge]').forEach((el) => { o[el.getAttribute('data-edge')] = el.getAttribute('data-mark'); });
      return o;
    });
    const free = Object.keys(before).find((k) => before[k] === '0');
    await press([Number(free)]);
    check(await markOf(Number(free)) === before[free], '완성 후에도 변이 바뀜');

    // 가로 스크롤 없음
    const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    check(noScroll, '가로 스크롤이 생김');

    console.log('E2E PASS ' + LABEL);
  } finally {
    await closeTab(page);
  }
};

try {
  await e2eMain();
} catch (err) {
  console.log('E2E FAIL: ' + (err && err.message ? err.message : String(err)));
}
