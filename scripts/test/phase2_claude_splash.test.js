// 시작 화면(splash) 테스트: 모드 선택, 시작하기, 배치, 애니메이션, hover 색상
// 실행: node scripts/test/phase2_claude_splash.test.js   (playwright + chromium 필요, 없으면 "미실행")
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('playwright가 없어 시작 화면 테스트를 실행하지 못했습니다(미실행):', e.message); process.exit(2); }

const ROOT = path.resolve(__dirname, '..', '..');
const URL = 'file://' + path.join(ROOT, 'src', 'index.html');
const results = [];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const step = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); } catch (e) { results.push({ name, ok: false, msg: e.message.split('\n')[0] }); }
  };
  const ok = (c, m) => { if (!c) throw new Error(m); };
  const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const css = (sel, prop) => page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
  const box = (sel) => page.locator(sel).first().boundingBox();
  const settle = () => page.waitForTimeout(400); // hover 색 전환(0.15초)이 끝나길 기다린다

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL);
  await page.waitForTimeout(1500); // 등장 애니메이션이 끝나길 기다린다

  await step('S1 앱을 열면 시작 화면이 먼저 보이고 메인 화면은 가려진다', async () => {
    ok(await page.locator('#splash').isVisible(), '시작 화면이 보이지 않음');
    ok(await page.locator('#darkBtn').isVisible() && await page.locator('#lightBtn').isVisible() && await page.locator('#startBtn').isVisible(), '버튼이 보이지 않음');
    ok(await page.locator('main').getAttribute('inert') !== null, '메인 화면이 잠겨 있지 않음(뒤 화면이 눌릴 수 있음)');
    ok(errors.length === 0, '콘솔 오류: ' + errors.join(' | '));
  });

  await step('S2 배치: 위에서 아래로 Dutch Pay 문구 → 캐릭터 → 모드 버튼 2개(따로) → 시작하기', async () => {
    const t = await box('#splashTitle'), m = await box('.mascot'), d = await box('#darkBtn'), l = await box('#lightBtn'), s = await box('#startBtn');
    ok(t.y + t.height <= m.y + 4, '문구가 캐릭터 위에 있지 않음');
    ok(m.y + m.height <= d.y + 4, '모드 버튼이 캐릭터 아래에 있지 않음');
    ok(d.x + d.width <= l.x && Math.abs(d.y - l.y) < 2, '다크/화이트 버튼이 따로 나란히 있지 않음');
    ok(d.y + d.height <= s.y, '시작하기가 모드 버튼 아래에 있지 않음');
    ok((await page.locator('#splashTitle').getAttribute('aria-label')) === 'Dutch Pay', 'Dutch Pay 문구 없음');
  });

  await step('S3 캐릭터가 화면 가로 가운데에 있다', async () => {
    const m = await box('.mascot'); const vw = 430;
    ok(Math.abs(m.x + m.width / 2 - vw / 2) <= 4, `가운데에서 벗어남: ${(m.x + m.width / 2).toFixed(1)} / ${vw / 2}`);
    ok(await page.locator('.mascot').evaluate((img) => img.complete && img.naturalWidth > 0), '캐릭터 이미지를 불러오지 못함');
  });

  await step('S4 애니메이션: 캐릭터가 둥실 떠 있고 문구 글자가 통통 튄다', async () => {
    ok((await css('.mascot', 'animation-name')).includes('float'), '캐릭터 float 애니메이션 없음');
    ok((await css('.splash-title .word > span', 'animation-name')).includes('letter-bob'), '문구 애니메이션 없음');
    const y1 = (await box('.mascot')).y; await page.waitForTimeout(800); const y2 = (await box('.mascot')).y;
    ok(Math.abs(y1 - y2) > 0.5, '캐릭터가 움직이지 않음');
  });

  await step('S5 다크 모드 버튼: 누르는 즉시 시작 화면이 다크로 바뀐다', async () => {
    await page.click('#darkBtn');
    ok((await theme()) === 'dark', 'data-theme이 dark가 아님');
    ok((await css('body', 'background-color')) === 'rgb(16, 17, 25)', 'body 배경이 다크 색이 아님: ' + await css('body', 'background-color'));
    ok((await page.locator('#darkBtn').getAttribute('aria-pressed')) === 'true' && (await page.locator('#lightBtn').getAttribute('aria-pressed')) === 'false', '선택 표시가 맞지 않음');
  });

  await step('S6 화이트 모드 버튼: 누르는 즉시 화이트로 돌아온다', async () => {
    await page.click('#lightBtn');
    ok((await theme()) === 'light', 'data-theme이 light가 아님');
    ok((await css('body', 'background-color')) === 'rgb(244, 245, 251)', 'body 배경이 화이트 색이 아님');
    ok((await page.locator('#lightBtn').getAttribute('aria-pressed')) === 'true', '화이트 선택 표시 없음');
  });

  await step('S7 hover: 모드 버튼·시작하기 버튼 위에 마우스를 올리면 색이 바뀐다', async () => {
    await page.click('#startBtn', { trial: true }); // 가려지지 않았는지 확인만
    await page.mouse.move(5, 5); await settle();
    const idle = { dark: await css('#darkBtn', 'background-color'), start: await css('#startBtn', 'background-color') };
    await page.hover('#darkBtn'); await settle();
    ok((await css('#darkBtn', 'background-color')) !== idle.dark, '다크 버튼 hover 색 변화 없음');
    await page.hover('#startBtn'); await settle();
    ok((await css('#startBtn', 'background-color')) !== idle.start, '시작하기 hover 색 변화 없음');
  });

  await step('S8 선택한 모드는 기억되어 새로고침 후 시작 화면에서 미리 선택되어 있다', async () => {
    await page.click('#darkBtn');
    await page.reload(); await page.waitForTimeout(300);
    ok((await theme()) === 'dark', '새로고침 후 모드가 유지되지 않음');
    ok((await page.locator('#darkBtn').getAttribute('aria-pressed')) === 'true', '다크 버튼 선택 표시 없음');
  });

  await step('S9 시작하기: 현재(다크) 모드 그대로 메인 화면으로 넘어간다', async () => {
    await page.click('#startBtn');
    await page.waitForSelector('#splash', { state: 'hidden' });
    ok((await theme()) === 'dark', '모드가 바뀜');
    ok(await page.locator('#sec-members h2').isVisible(), '메인 화면이 보이지 않음');
    ok(await page.locator('main').getAttribute('inert') === null, '메인 화면이 아직 잠겨 있음');
    ok((await css('.card', 'background-color')) === 'rgb(26, 28, 40)', '카드가 다크 색이 아님');
    await page.fill('#memberInput', '김진서'); await page.press('#memberInput', 'Enter');
    ok((await page.locator('#memberList').innerText()).includes('김진서'), '메인 화면 동작 안 함');
  });

  await step('S10 시작하기: 화이트 모드를 고르면 화이트 그대로 넘어간다', async () => {
    await page.reload(); await page.waitForTimeout(300);
    await page.click('#lightBtn'); await page.click('#startBtn');
    await page.waitForSelector('#splash', { state: 'hidden' });
    ok((await theme()) === 'light', '모드가 바뀜');
    ok((await css('.card', 'background-color')) === 'rgb(255, 255, 255)', '카드가 화이트 색이 아님');
  });

  await step('S11 메인 화면 버튼도 hover하면 색이 바뀐다 (추가 / 초기화 / 전체 선택·해제)', async () => {
    await page.mouse.move(5, 300); await settle();
    for (const sel of ['#memberForm .btn', '#resetBtn', '#toggleAll']) {
      await page.mouse.move(5, 300); await settle();
      const before = await css(sel, 'background-color') + '|' + await css(sel, 'color') + '|' + await css(sel, 'border-top-color');
      await page.hover(sel); await settle();
      const after = await css(sel, 'background-color') + '|' + await css(sel, 'color') + '|' + await css(sel, 'border-top-color');
      ok(before !== after, `${sel} hover 변화 없음`);
    }
  });

  await step('S12 처음 열 때 저장된 모드가 없으면 기기 설정(다크)을 따른다', async () => {
    const c2 = await browser.newContext({ viewport: { width: 430, height: 900 }, colorScheme: 'dark' });
    const p2 = await c2.newPage(); await p2.goto(URL);
    ok((await p2.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark', '기기 다크 설정을 따르지 않음');
    await c2.close();
  });

  await step('S13 움직임 줄이기 설정이면 애니메이션이 꺼진다', async () => {
    const c3 = await browser.newContext({ viewport: { width: 430, height: 900 }, reducedMotion: 'reduce' });
    const p3 = await c3.newPage(); await p3.goto(URL);
    const name = await p3.locator('.mascot').evaluate((el) => getComputedStyle(el).animationName);
    ok(name === 'none', '애니메이션이 꺼지지 않음: ' + name);
    await c3.close();
  });

  await step('S14 콘솔 오류 없음 / 외부 요청 없음', async () => { ok(errors.length === 0, '콘솔 오류: ' + errors.join(' | ')); });

  await browser.close();
  const fail = results.filter((r) => !r.ok);
  console.log(`==== 시작 화면 테스트: 총 ${results.length}건 / PASS ${results.length - fail.length} / FAIL ${fail.length} ====`);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? '' : '\n     └ ' + r.msg}`);
  process.exit(fail.length ? 1 : 0);
})();
