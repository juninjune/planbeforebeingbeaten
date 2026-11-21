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
    const attr = (sel, name) => page.evaluate(([s, n]) => { const el = document.querySelector(s); return el ? el.getAttribute(n) : null; }, [sel, name]);
    const has = async (sel) => (await page.locator(sel).count()) > 0;
    const markOf = (e) => page.evaluate((i) => document.querySelector('[data-edge="' + i + '"]').getAttribute('data-mark'), e);
    const centers = async () => page.evaluate(() => {
      const out = {};
      document.querySelectorAll('[data-edge]').forEach((el) => {
        const b = el.getBoundingClientRect();
        out[el.getAttribute('data-edge')] = [b.left + b.width / 2, b.top + b.height / 2];
      });
      return out;
    });
    const shot = async (name) => {
      const rel = './artifacts/' + name + '.png';
      await page.screenshot({ path: rel });
      console.log('SHOT ' + name + ' ' + path.resolve(rel));
      const data = await fs.readFile(rel);
      console.log('SHOTDATA ' + name + ' ' + Buffer.from(data).toString('base64'));
    };

    await page.waitForSelector('[data-testid="lobby"]', { timeout: 10000 }).catch(() => fail('로비가 보이지 않음'));
    // 첫 방문 상태로 만든다
    await page.evaluate(() => { try { localStorage.removeItem('fence.rulesSeen'); } catch (e) {} location.reload(); });
    await sleep(1000);
    await page.waitForSelector('[data-testid="lobby"]', { timeout: 10000 }).catch(() => fail('새로 고친 뒤 로비가 보이지 않음'));
    await page.locator('[data-testid="game-fence"]').click();
    await page.waitForSelector('[data-testid="fence-screen"]', { timeout: 10000 }).catch(() => fail('게임 화면이 열리지 않음'));

    // 첫 방문: 규칙이 자동으로 열려 있다
    check(await has('[data-testid="rules"]'), '첫 방문인데 규칙 시트가 열리지 않음');
    check(await attr('[data-testid="rules"]', 'role') === 'dialog', "규칙 시트 role이 dialog가 아님");
    check(await attr('[data-testid="rules"]', 'aria-modal') === 'true', '규칙 시트에 aria-modal이 없음');
    const closeLabel = ((await page.locator('[data-testid="rules-close"]').textContent()) || '').trim();
    check(closeLabel === '시작', '첫 방문 닫기 버튼 문구가 시작이 아님: ' + closeLabel);
    const timerText = async () => ((await page.locator('[data-testid="timer"]').textContent()) || '').trim();
    const toMs = (t) => { const m = /^(\d+):(\d{2})\.(\d{2})$/.exec(t); return m ? (Number(m[1]) * 60 + Number(m[2])) * 1000 + Number(m[3]) * 10 : -1; };
    await sleep(900);
    check(await timerText() === '0:00.00', '규칙이 열려 있는 동안 타이머가 흐름: ' + await timerText());
    await shot(LABEL);

    // 시트가 열려 있는 동안 판은 눌리지 않는다
    let c = await centers();
    await page.mouse.click(c[0][0], c[0][1]);
    check(await markOf(0) === '0', '규칙 시트가 열려 있는데 판이 눌림');

    // 닫으면 타이머가 0에서 시작한다
    await page.locator('[data-testid="rules-close"]').click();
    await waitUntil(async () => !(await has('[data-testid="rules"]')), '규칙 시트가 닫히지 않음');
    check(await page.evaluate(() => { try { return localStorage.getItem('fence.rulesSeen') !== null; } catch (e) { return false; } }), '닫은 뒤 localStorage 키가 저장되지 않음');
    await sleep(300);
    const t1 = toMs(await timerText());
    check(t1 >= 0 && t1 < 2500, '닫은 뒤 타이머가 0에서 시작하지 않음: ' + t1);
    c = await centers();
    await page.mouse.click(c[0][0], c[0][1]);
    check(await markOf(0) === '1', '닫은 뒤 판이 눌리지 않음');

    // 직접 다시 열면 타이머는 계속 흐른다
    const before = toMs(await timerText());
    await page.locator('[data-testid="rules-open"]').click();
    await waitUntil(async () => await has('[data-testid="rules"]'), 'rules-open으로 규칙이 열리지 않음');
    const closeLabel2 = ((await page.locator('[data-testid="rules-close"]').textContent()) || '').trim();
    check(closeLabel2 === '닫기', '다시 연 시트의 닫기 문구가 닫기가 아님: ' + closeLabel2);
    await sleep(800);
    check(toMs(await timerText()) > before + 500, '직접 연 규칙 시트에서 타이머가 멈춤');
    await page.locator('[data-testid="rules-close"]').click();
    await waitUntil(async () => !(await has('[data-testid="rules"]')), '다시 연 규칙 시트가 닫히지 않음');

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
