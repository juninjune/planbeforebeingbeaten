// aside repl용 스크립트. run.sh가 자리표시자를 치환해서 실행한다.
const BASE_URL = '__BASE_URL__';
const LABEL = '__LABEL__';

const fail = (msg) => { throw new Error(msg); };
const check = (cond, msg) => { if (!cond) fail(msg); };
const T = (id) => '[data-testid="' + id + '"]';

const e2eMain = async () => {
  const page = await openTab(BASE_URL + '/#/');
  try {
    await page.setViewportSize({ width: 390, height: 844 });

    // 통계 서버로 가는 요청을 감시한다
    const requests = [];
    let watching = false;
    if (typeof page.on === 'function') {
      try { page.on('request', (r) => { try { requests.push(String(typeof r.url === 'function' ? r.url() : r.url)); } catch (e) {} }); watching = true; } catch (e) {}
    }

    const waitUntil = async (fn, what) => {
      for (let i = 0; i < 80; i++) {
        if (await fn()) return;
        await sleep(100);
      }
      fail(what);
    };
    const has = async (sel) => (await page.locator(sel).count()) > 0;
    const attr = (sel, name) => page.evaluate(([s, n]) => { const el = document.querySelector(s); return el ? el.getAttribute(n) : null; }, [sel, name]);
    const markOf = (e) => page.evaluate((i) => document.querySelector('[data-edge="' + i + '"]').getAttribute('data-mark'), e);
    const closeRulesIfOpen = async () => {
      if (await has(T('rules'))) {
        await page.locator(T('rules-close')).click();
        await waitUntil(async () => !(await has(T('rules'))), '규칙 시트가 닫히지 않음');
      }
    };
    const centers = () => page.evaluate(() => {
      const out = {};
      document.querySelectorAll('[data-edge]').forEach((el) => {
        const b = el.getBoundingClientRect();
        out[el.getAttribute('data-edge')] = [b.left + b.width / 2, b.top + b.height / 2];
      });
      return out;
    });
    const solveBoard = async () => {
      const info = await page.evaluate(() => window.__fence);
      check(info && Array.isArray(info.solution), 'window.__fence 훅이 없음');
      const c = await centers();
      for (const e of info.solution) {
        if (await markOf(e) === '1') continue;
        await page.mouse.click(c[e][0], c[e][1]);
      }
      await page.waitForSelector(T('complete'), { timeout: 5000 }).catch(() => fail('정답을 눌렀는데 완성 화면이 나오지 않음'));
    };

    // 기록을 지우고 새로 고쳐 "처음 완성"으로 만든다. 새로 고치면 __hits도 비워진다
    await page.waitForSelector(T('lobby'), { timeout: 10000 }).catch(() => fail('로비가 보이지 않음'));
    await page.evaluate(() => { try { localStorage.removeItem('fence.records.v1'); } catch (e) {} location.reload(); });
    await sleep(1000);
    await page.waitForSelector(T('lobby'), { timeout: 10000 }).catch(() => fail('새로 고친 뒤 로비가 보이지 않음'));
    check(await has(T('stats-note')), '로비에 stats-note가 없음');
    check(await has(T('disclaimer')), '로비에 disclaimer가 없음');

    // 로비 -> 울타리 치기 7x7(기본) -> 힌트 두 번 -> 완성 -> 공유 -> 로비
    await page.locator(T('game-fence')).click();
    await page.waitForSelector(T('fence-screen'), { timeout: 10000 }).catch(() => fail('게임 화면이 열리지 않음'));
    await closeRulesIfOpen();
    check(await attr(T('fence-screen'), 'data-size') === '7', '기본 크기가 7이 아님');
    check(await has(T('stats-note')), '게임 화면에 stats-note가 없음');
    await page.locator(T('hint')).click();
    await page.locator(T('hint')).click();
    await solveBoard();
    await sleep(2200);
    await page.locator(T('share')).click();
    await page.waitForSelector(T('share-sheet'), { timeout: 5000 }).catch(() => fail('공유 시트가 열리지 않음'));
    await page.locator(T('share-close')).click();
    await waitUntil(async () => !(await has(T('share-sheet'))), '공유 시트가 닫히지 않음');
    await page.locator(T('to-lobby')).click();
    await page.waitForSelector(T('lobby'), { timeout: 10000 }).catch(() => fail('로비로 돌아가지 못함'));

    // 오늘의 판 5x5 완성
    await page.locator(T('daily-5')).click();
    await page.waitForSelector(T('fence-screen'), { timeout: 10000 });
    await closeRulesIfOpen();
    check(await attr(T('fence-screen'), 'data-daily') === 'true', '오늘의 판이 아님');
    await solveBoard();
    await sleep(300);

    const hits = await page.evaluate(() => window.__hits || []);
    const views = hits.filter((h) => !h.event).map((h) => h.path);
    const events = hits.filter((h) => h.event).map((h) => h.path);
    console.log('VIEWS ' + JSON.stringify(views));
    console.log('EVENTS ' + JSON.stringify(events));
    const count = (name) => events.filter((e) => e === name).length;

    check(views.length >= 2 && views[0] === '/' && views[1] === '/fence', '화면 이동 순서가 / , /fence가 아님: ' + JSON.stringify(views));
    check(views.every((p, i) => (p === '/' || p === '/fence') && (i === 0 || views[i - 1] !== p)), '화면 이동에 다른 경로가 있거나 같은 경로가 연속됨: ' + JSON.stringify(views));
    check(count('fence/start/7') === 1, 'fence/start/7이 한 번이 아님: ' + count('fence/start/7'));
    check(count('fence/hint/7') === 1, 'fence/hint/7이 정확히 한 번이 아님: ' + count('fence/hint/7'));
    check(count('fence/complete/7') === 1, 'fence/complete/7이 한 번이 아님');
    check(count('fence/share/7') === 1, 'fence/share/7이 한 번이 아님');
    check(count('fence/start/5') === 1, 'fence/start/5가 한 번이 아님');
    check(count('fence/complete/5') === 1, 'fence/complete/5가 한 번이 아님');
    check(count('fence/daily-complete/5') === 1, 'fence/daily-complete/5가 한 번이 아님');
    check(count('fence/daily-complete/7') === 0, '자유 판에서 daily-complete가 찍힘');
    for (const h of hits) {
      check(!/seed|ct=|ch=|\d{4,}/.test(h.path), '집계 경로에 식별값이 섞임: ' + h.path);
    }

    // 통계 서버로 가는 요청은 0건
    const entries = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name));
    check(!entries.some((u) => u.includes('goatcounter')), 'goatcounter 리소스 요청이 있음');
    check(!requests.some((u) => u.includes('goatcounter')), 'goatcounter 요청이 감시에 잡힘');
    console.log('WATCH ' + (watching ? 'page.on(request) ' + requests.length + '건' : 'resource entries만'));

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
