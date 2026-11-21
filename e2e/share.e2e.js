// aside repl용 스크립트. run.sh가 자리표시자를 치환해서 실행한다.
const BASE_URL = '__BASE_URL__';
const LABEL = '__LABEL__';

const fail = (msg) => { throw new Error(msg); };
const check = (cond, msg) => { if (!cond) fail(msg); };
const T = (id) => '[data-testid="' + id + '"]';

// 탭(page)마다 쓰는 도우미
const api = (pg) => {
  const waitUntil = async (fn, what) => {
    for (let i = 0; i < 80; i++) {
      if (await fn()) return;
      await sleep(100);
    }
    fail(what);
  };
  const has = async (sel) => (await pg.locator(sel).count()) > 0;
  const attr = (sel, name) => pg.evaluate(([s, n]) => { const el = document.querySelector(s); return el ? el.getAttribute(n) : null; }, [sel, name]);
  const text = async (sel) => ((await pg.locator(sel).textContent()) || '').trim();
  const markOf = (e) => pg.evaluate((i) => document.querySelector('[data-edge="' + i + '"]').getAttribute('data-mark'), e);
  const centers = () => pg.evaluate(() => {
    const out = {};
    document.querySelectorAll('[data-edge]').forEach((el) => {
      const b = el.getBoundingClientRect();
      out[el.getAttribute('data-edge')] = [b.left + b.width / 2, b.top + b.height / 2];
    });
    return out;
  });
  const open = async (hashPath) => {
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.waitForSelector(T('board'), { timeout: 10000 }).catch(() => fail('보드가 보이지 않음: ' + hashPath));
    if (await has(T('rules'))) {
      await pg.locator(T('rules-close')).click();
      await waitUntil(async () => !(await has(T('rules'))), '규칙 시트가 닫히지 않음');
    }
  };
  // 정답에서 아직 선이 아닌 변만 눌러 완성한다
  const solveBoard = async () => {
    const info = await pg.evaluate(() => window.__fence);
    check(info && Array.isArray(info.solution), 'window.__fence 훅이 없음');
    const c = await centers();
    for (const e of info.solution) {
      if (await markOf(e) === '1') continue;
      await pg.mouse.click(c[e][0], c[e][1]);
    }
    await pg.waitForSelector(T('complete'), { timeout: 5000 }).catch(() => fail('정답을 눌렀는데 완성 화면이 나오지 않음'));
    return info;
  };
  const shot = async (name) => {
    const rel = './artifacts/' + name + '.png';
    await pg.screenshot({ path: rel });
    console.log('SHOT ' + name + ' ' + path.resolve(rel));
    const data = await fs.readFile(rel);
    console.log('SHOTDATA ' + name + ' ' + Buffer.from(data).toString('base64'));
  };
  // 공유 시트를 열고 카드 PNG를 name으로 내보낸다. 카드 크기를 확인한다
  const openShare = async (cardName) => {
    await sleep(2200); // 완성 패널 등장 연출이 끝나야 눌린다
    await pg.locator(T('share')).click();
    await pg.waitForSelector(T('share-sheet'), { timeout: 5000 }).catch(() => fail('공유 시트가 열리지 않음'));
    check(await attr(T('share-sheet'), 'role') === 'dialog', '공유 시트 role이 dialog가 아님');
    check(await attr(T('share-sheet'), 'aria-modal') === 'true', '공유 시트에 aria-modal이 없음');
    await waitUntil(() => pg.evaluate(() => { const i = document.querySelector('[data-testid="result-card"]'); return !!(i && i.complete && i.naturalWidth > 0); }), '카드 이미지가 로드되지 않음');
    const src = await attr(T('result-card'), 'src');
    check(src && src.startsWith('data:image/png;base64,'), '카드 src가 PNG data URL이 아님');
    const dim = await pg.evaluate(() => { const i = document.querySelector('[data-testid="result-card"]'); return [i.naturalWidth, i.naturalHeight]; });
    check(dim[0] === 1080 && dim[1] === 1350, '카드 크기가 1080x1350이 아님: ' + dim);
    if (cardName) console.log('SHOTDATA ' + cardName + ' ' + src.slice('data:image/png;base64,'.length));
    return await pg.locator(T('share-url')).inputValue();
  };
  const closeShare = async () => {
    await pg.locator(T('share-close')).click();
    await waitUntil(async () => !(await has(T('share-sheet'))), '공유 시트가 닫히지 않음');
  };
  return { waitUntil, has, attr, text, markOf, centers, open, solveBoard, shot, openShare, closeShare };
};

const withTab = async (url, fn) => {
  const pg = await openTab(url);
  try {
    const a = api(pg);
    await a.open(url);
    return await fn(pg, a);
  } finally {
    await closeTab(pg);
  }
};

const e2eMain = async () => {
  const ROOT = BASE_URL + '/#/fence?';
  let shareUrl = '';
  let origClues = null;
  let ctValue = 0;

  // a, b. 자유 판 5x5 완성 -> 공유 시트, 카드, 링크
  await withTab(ROOT + 'size=5&seed=e2e-share', async (pg, a) => {
    const info = await a.solveBoard();
    origClues = info.clues;
    const recText = await a.text(T('record-time'));
    check(/^\d+:\d{2}\.\d{2}$/.test(recText), '기록 시간 형식 불일치: ' + recText);
    shareUrl = await a.openShare('fence-card');

    const u = new URL(shareUrl);
    const q = new URLSearchParams(u.hash.slice(u.hash.indexOf('?') + 1));
    check(u.origin === new URL(BASE_URL).origin, '링크 origin 불일치: ' + shareUrl);
    check(q.get('size') === '5' && q.get('seed') === 'e2e-share', '링크의 size, seed 불일치: ' + shareUrl);
    check(q.get('ch') === '0', '링크의 ch가 0이 아님: ' + shareUrl);
    ctValue = Number(q.get('ct'));
    const m = /^(\d+):(\d{2})\.(\d{2})$/.exec(recText);
    const recCs = (Number(m[1]) * 60 + Number(m[2])) * 100 + Number(m[3]);
    check(Number.isInteger(ctValue) && Math.floor(ctValue / 10) === recCs, 'ct가 기록 시간과 다름: ' + ctValue + ' / ' + recText);

    check(await a.attr(T('save-card'), 'download') !== null, 'save-card에 download가 없음');
    check(((await a.attr(T('save-card'), 'href')) || '').startsWith('data:image/png;base64,'), 'save-card href가 PNG가 아님');
    console.log('NATIVE ' + (await a.has(T('share-native'))));

    await pg.locator(T('copy-link')).click();
    await a.waitUntil(async () => ['true', 'manual'].includes(await a.attr(T('copy-link'), 'data-copied')), '복사 결과 data-copied가 없음');
    const copied = await a.attr(T('copy-link'), 'data-copied');
    console.log('COPIED ' + copied);
    // clipboard.readText는 권한 창에서 멈출 수 있어 값 읽기는 하지 않는다
    if (copied === 'manual') check(await a.has('.share-note'), 'manual인데 안내 문구가 없음');
    await a.shot('fence-share-sheet');
    await a.closeShare();
  });

  // c. 링크를 새 탭으로 열면 같은 판과 도전 기록
  await withTab(shareUrl, async (pg, a) => {
    const clues = await pg.evaluate(() => window.__fence.clues);
    check(JSON.stringify(clues) === JSON.stringify(origClues), '공유 링크의 판이 원래 판과 다름');
    check(await a.has(T('challenge-banner')), 'challenge-banner가 없음');
    check(await a.attr(T('challenge-banner'), 'data-ms') === String(ctValue), 'data-ms 불일치');
    check(await a.attr(T('challenge-banner'), 'data-hints') === '0', 'data-hints 불일치');
  });

  // d. 도전 결과
  const BASE5 = ROOT + 'size=5&seed=e2e-share';
  await withTab(BASE5 + '&ct=1&ch=0', async (pg, a) => {
    await a.solveBoard();
    check(await a.attr(T('challenge-result'), 'data-outcome') === 'lose', 'lose가 아님');
    check((await a.text(T('challenge-result'))).includes('느림'), 'lose 문구에 느림이 없음');
  });
  await withTab(BASE5 + '&ct=86400000', async (pg, a) => {
    check(await a.attr(T('challenge-banner'), 'data-hints') === '0', 'ch가 없으면 0이어야 함');
    await a.solveBoard();
    check(await a.attr(T('challenge-result'), 'data-outcome') === 'win', 'win이 아님');
    check((await a.text(T('challenge-result'))).includes('빠름'), 'win 문구에 빠름이 없음');
    await sleep(2200);
    await a.shot('fence-challenge-result');
  });
  await withTab(BASE5 + '&ct=86400000&ch=0', async (pg, a) => {
    await pg.locator(T('hint')).click();
    await a.solveBoard();
    check(await a.attr(T('challenge-result'), 'data-outcome') === 'assisted', 'assisted가 아님');
  });

  // e. 잘못된 값은 무시
  for (const bad of ['ct=abc', 'ct=-5']) {
    await withTab(BASE5 + '&' + bad, async (pg, a) => {
      check(!(await a.has(T('challenge-banner'))), bad + ': challenge-banner가 있음');
      await a.solveBoard();
      check(!(await a.has(T('challenge-result'))), bad + ': challenge-result가 있음');
    });
  }

  // f. 오늘의 판 공유
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  let dailyShare = '';
  await withTab(ROOT + 'size=5&daily=1', async (pg, a) => {
    await a.solveBoard();
    dailyShare = await a.openShare(null);
    const u = new URL(dailyShare);
    const q = new URLSearchParams(u.hash.slice(u.hash.indexOf('?') + 1));
    check(q.get('seed') === 'daily-' + today, '오늘의 판 링크 seed 불일치: ' + dailyShare);
    check(!q.has('daily'), '오늘의 판 링크에 daily 파라미터가 있음');
  });
  await withTab(dailyShare, async (pg, a) => {
    check(await a.attr(T('fence-screen'), 'data-daily') === 'true', '오늘의 판 링크가 오늘의 판으로 열리지 않음');
    check(!(await a.has(T('hint'))), '오늘의 판 링크에 힌트 버튼이 있음');
    check(await a.has(T('daily-label')), 'daily-label이 없음');
  });
  await withTab(ROOT + 'size=5&seed=daily-2000-01-01', async (pg, a) => {
    check(await a.attr(T('fence-screen'), 'data-daily') === 'false', '다른 날짜의 daily 시드가 자유 판이 아님');
    check(await a.has(T('hint')), '자유 판에 힌트 버튼이 없음');
  });

  // g. 10x10 카드
  await withTab(ROOT + 'size=10&seed=e2e-card10', async (pg, a) => {
    await a.solveBoard();
    await a.openShare('fence-card-10');
  });

  console.log('E2E PASS ' + LABEL);
};

try {
  await e2eMain();
} catch (err) {
  console.log('E2E FAIL: ' + (err && err.message ? err.message : String(err)));
}
