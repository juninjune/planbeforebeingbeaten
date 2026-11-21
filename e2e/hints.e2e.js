// aside repl용 스크립트. run.sh가 자리표시자를 치환해서 실행한다.
const BASE_URL = '__BASE_URL__';
const LABEL = '__LABEL__';

const fail = (msg) => { throw new Error(msg); };
const check = (cond, msg) => { if (!cond) fail(msg); };

const e2eMain = async () => {
  const page = await openTab(BASE_URL + '/#/fence?size=5&seed=e2e-hint');
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

    await page.waitForSelector('[data-testid="board"]', { timeout: 10000 }).catch(() => fail('보드가 보이지 않음'));
    if (await has('[data-testid="rules"]')) {
      await page.locator('[data-testid="rules-close"]').click();
      await waitUntil(async () => !(await has('[data-testid="rules"]')), '규칙 시트가 닫히지 않음');
    }
    check(!(await has('[data-testid="hint-count"]')), '힌트를 쓰기 전에 hint-count가 보임');
    check(!(await has('[data-testid="record-hints"]')), '힌트를 쓰기 전에 record-hints가 보임');

    let n = 0;
    while (!(await has('[data-testid="complete"]'))) {
      check(n < 80, '힌트 80번으로도 완성되지 않음');
      await page.locator('[data-testid="hint"]').click();
      n++;
      if (n === 3) {
        check(await has('[data-edge][data-hint="true"]'), '힌트 강조(data-hint)가 없음');
        await shot('fence-hint');
      }
    }
    check(n >= 3, '힌트 3번 안에 끝남: ' + n);
    check(await attr('[data-testid="fence-screen"]', 'data-solved') === 'true', '완성 후 data-solved가 true가 아님');
    const rec = ((await page.locator('[data-testid="record-hints"]').textContent()) || '');
    check(rec.includes(String(n)), '완성 패널의 힌트 횟수가 다름: ' + rec + ' / ' + n);
    check(await has('[data-testid="hint"][disabled]'), '완성 후 힌트 버튼이 비활성이 아님');
    console.log('HINTS ' + n);
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
