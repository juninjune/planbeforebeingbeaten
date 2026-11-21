// aside repl용 스크립트. run.sh가 자리표시자를 치환해서 실행한다.
const BASE_URL = '__BASE_URL__';
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
    const T = (id) => '[data-testid="' + id + '"]';
    const has = async (sel) => (await page.locator(sel).count()) > 0;
    const attr = (sel, name) => page.evaluate(([s, n]) => { const el = document.querySelector(s); return el ? el.getAttribute(n) : null; }, [sel, name]);
    const text = async (sel) => ((await page.locator(sel).textContent()) || '').trim();
    const markOf = (e) => page.evaluate((i) => document.querySelector('[data-edge="' + i + '"]').getAttribute('data-mark'), e);
    const closeRulesIfOpen = async () => {
      if (await has(T('rules'))) {
        await page.locator(T('rules-close')).click();
        await waitUntil(async () => !(await has(T('rules'))), '규칙 시트가 닫히지 않음');
      }
    };
    const shot = async (name) => {
      const rel = './artifacts/' + name + '.png';
      await page.screenshot({ path: rel });
      console.log('SHOT ' + name + ' ' + path.resolve(rel));
      const data = await fs.readFile(rel);
      console.log('SHOTDATA ' + name + ' ' + Buffer.from(data).toString('base64'));
    };
    const centers = async () => page.evaluate(() => {
      const out = {};
      document.querySelectorAll('[data-edge]').forEach((el) => {
        const b = el.getBoundingClientRect();
        out[el.getAttribute('data-edge')] = [b.left + b.width / 2, b.top + b.height / 2];
      });
      return out;
    });
    // 정답에서 아직 선이 아닌 변만 눌러 완성한다
    const solveBoard = async () => {
      const info = await page.evaluate(() => window.__fence);
      check(info && Array.isArray(info.solution), 'window.__fence 훅이 없음');
      const c = await centers();
      for (const e of info.solution) {
        if (await markOf(e) === '1') continue;
        await page.mouse.click(c[e][0], c[e][1]);
      }
      await page.waitForSelector(T('complete'), { timeout: 5000 }).catch(() => fail('정답을 눌렀는데 완성 화면이 나오지 않음'));
      return info;
    };
    const gotoLobby = async () => {
      await page.evaluate(() => { window.location.hash = '#/'; });
      await page.waitForSelector(T('lobby'), { timeout: 10000 }).catch(() => fail('로비가 보이지 않음'));
    };
    const reload = async () => {
      await page.evaluate(() => location.reload());
      await sleep(1000);
      await page.waitForSelector('[data-testid="disclaimer"]', { timeout: 10000 }).catch(() => fail('새로 고친 뒤 화면이 보이지 않음'));
    };
    const fitsScreen = async (sel) => page.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return b.bottom <= window.innerHeight && document.documentElement.scrollHeight <= window.innerHeight + 1; }, sel);

    // 1. 기록을 지우고 새로 고친다
    await page.waitForSelector(T('lobby'), { timeout: 10000 }).catch(() => fail('로비가 보이지 않음'));
    await page.evaluate(() => { try { localStorage.removeItem('fence.records.v1'); } catch (e) {} });
    await reload();

    // 2. 로비: 모두 미완료, 연속 0
    for (const n of [5, 7, 10]) {
      check(await attr(T('daily-' + n), 'data-done') === 'false', '로비 daily-' + n + '이 처음부터 done');
    }
    check(await attr(T('streak'), 'data-streak') === '0', '처음 연속 일수가 0이 아님');

    // 3. daily-7 진입
    await page.locator(T('daily-7')).click();
    await page.waitForSelector(T('fence-screen'), { timeout: 10000 }).catch(() => fail('오늘의 판이 열리지 않음'));
    await closeRulesIfOpen();
    check(await attr(T('fence-screen'), 'data-daily') === 'true', 'data-daily가 true가 아님');
    check(await attr(T('fence-screen'), 'data-size') === '7', '크기가 7이 아님');
    check(await has(T('daily-label')), 'daily-label이 없음');
    check(!(await has(T('hint'))), '오늘의 판에 힌트 버튼이 있음');
    check(await attr(T('best-time'), 'data-empty') === 'true', '처음 best-time이 비어 있지 않음');
    check(await attr(T('solved-count'), 'data-count') === '0', '처음 solved-count가 0이 아님');
    const dailyHash = await page.evaluate(() => window.location.hash);
    check(dailyHash.includes('daily=1'), '주소에 daily=1이 없음: ' + dailyHash);

    // 4. 두 번째 탭에서 같은 주소: 같은 판
    const clues1 = await page.evaluate(() => window.__fence.clues);
    const page2 = await openTab(BASE_URL + '/' + dailyHash);
    try {
      await page2.waitForSelector(T('board'), { timeout: 10000 });
      const clues2 = await page2.evaluate(() => window.__fence.clues);
      check(JSON.stringify(clues1) === JSON.stringify(clues2), '같은 날 같은 크기인데 clues가 다름');
    } finally {
      await closeTab(page2);
    }

    // 5. 완성: 최고 기록 갱신, 연속 1일
    await solveBoard();
    check(await has(T('new-best')), '첫 완성에 new-best가 없음');
    check((await text(T('daily-streak'))).includes('1'), '완성 패널 연속 일수가 1이 아님: ' + await text(T('daily-streak')));
    check((await text(T('new-game'))) === '자유 판', '오늘의 판 완성 패널 버튼 문구가 자유 판이 아님');
    await sleep(2200);
    check(await fitsScreen(T('complete')), '완성 패널이 한 화면에 들어오지 않음');
    await shot('fence-daily-complete');

    // 6. 로비: 7만 done, 연속 1, 새로 고쳐도 유지
    await page.locator(T('to-lobby')).click();
    await page.waitForSelector(T('lobby'), { timeout: 10000 }).catch(() => fail('로비로 돌아가지 못함'));
    const lobbyState = async () => [await attr(T('daily-5'), 'data-done'), await attr(T('daily-7'), 'data-done'), await attr(T('daily-10'), 'data-done'), await attr(T('streak'), 'data-streak')].join(',');
    check(await lobbyState() === 'false,true,false,1', '완성 뒤 로비 상태가 다름: ' + await lobbyState());
    await reload();
    check(await lobbyState() === 'false,true,false,1', '새로 고친 뒤 로비 상태가 다름: ' + await lobbyState());
    await shot('fence-daily-lobby');

    // 7. 다시 진입: 이미 풀었다는 안내
    await page.locator(T('daily-7')).click();
    await page.waitForSelector(T('fence-screen'), { timeout: 10000 });
    await closeRulesIfOpen();
    check(await has(T('daily-done-note')), '이미 푼 오늘의 판에 안내가 없음');
    check(await attr(T('size-7'), 'data-daily-done') === 'true', 'size-7 data-daily-done이 true가 아님');
    check(await attr(T('size-5'), 'data-daily-done') === 'false', 'size-5 data-daily-done이 false가 아님');

    // 8. 오늘의 판을 끄면 자유 판: 힌트 버튼이 있다
    await page.locator(T('daily-toggle')).click();
    await waitUntil(async () => await attr(T('fence-screen'), 'data-daily') === 'false', '토글을 꺼도 자유 판이 되지 않음');
    check(await has(T('hint')), '자유 판에 힌트 버튼이 없음');
    check(!(await has(T('daily-label'))), '자유 판에 daily-label이 있음');
    check((await page.evaluate(() => window.location.hash)).includes('seed='), '자유 판 주소에 seed가 없음');

    // 9. 자유 판 5x5: 힌트 한 번 + 나머지 풀이 -> new-best 없음, 최고 기록 비어 있음, 푼 판 1
    await page.locator(T('size-5')).click();
    await waitUntil(async () => await attr(T('fence-screen'), 'data-size') === '5', '5x5로 바뀌지 않음');
    check(await attr(T('fence-screen'), 'data-daily') === 'false', '자유 판 5x5가 아님');
    check(await attr(T('solved-count'), 'data-count') === '0', '5x5 푼 판 수가 0이 아님');
    await page.locator(T('hint')).click();
    await solveBoard();
    check(!(await has(T('new-best'))), '힌트를 쓴 완성에 new-best가 있음');
    check(await attr(T('best-time'), 'data-empty') === 'true', '힌트 완성이 최고 기록을 만듦');
    check(await attr(T('solved-count'), 'data-count') === '1', '힌트 완성 뒤 푼 판 수가 1이 아님');
    check((await text(T('new-game'))) === '새 판', '자유 판 완성 패널 버튼 문구가 새 판이 아님');

    // 10. 자유 판 5x5를 힌트 없이: new-best, 최고 기록, 푼 판 2
    await sleep(2200);
    await page.locator(T('new-game')).click();
    await waitUntil(async () => !(await has(T('complete'))) && await attr(T('fence-screen'), 'data-size') === '5', '새 판이 열리지 않음');
    await solveBoard();
    check(await has(T('new-best')), '힌트 없는 완성에 new-best가 없음');
    check(await attr(T('best-time'), 'data-empty') === 'false' && (await text(T('best-time'))).includes(':'), '최고 기록 값이 없음');
    check(await attr(T('solved-count'), 'data-count') === '2', '푼 판 수가 2가 아님');
    await reload();
    await closeRulesIfOpen();
    check(await attr(T('best-time'), 'data-empty') === 'false', '새로 고친 뒤 최고 기록이 사라짐');
    check(await attr(T('solved-count'), 'data-count') === '2', '새로 고친 뒤 푼 판 수가 다름');

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
