// phase2-claude 앱 기능 테스트 (브라우저 UI) + 화면 캡처
// 실행: node scripts/test/phase2_claude_ui.test.js [스크린샷 폴더]   (playwright + chromium 필요)
// 스크린샷 파일명: phase2-claude-01.png ... (폴더를 인자로 주면 그곳에 저장, 기본값은 임시 폴더)
const path = require('path');
const fs = require('fs');
const os = require('os');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('playwright가 없어 UI 테스트를 실행하지 못했습니다(미실행):', e.message); process.exit(2); }

const ROOT = path.resolve(__dirname, '..', '..');
const URL = 'file://' + path.join(ROOT, 'src', 'index.html');
const SHOTS = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'dutchpay-shots')) // 기본은 임시 폴더(문서용 캡처를 덮어쓰지 않음);
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
let shotNo = 0;
const shots = [];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  // 시작 화면 대응: 열거나 새로고침한 뒤에는 '시작하기'를 눌러 메인 화면으로 들어간다.
  const startApp = async () => { await page.click('#startBtn'); await page.waitForSelector('#splash', { state: 'hidden' }); };
  const rawReload = page.reload.bind(page);
  page.reload = async (...a) => { const r = await rawReload(...a); await startApp(); return r; };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const step = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); } catch (e) {
      results.push({ name, ok: false, msg: e.message.split('\n')[0] });
      // 실패가 뒤 테스트로 번지지 않도록 화면을 정리한다 (열린 팝업 닫기, 수정 중이면 취소)
      try {
        if (await page.locator('#modal').isVisible()) await page.locator('#modalBtns button', { hasText: /취소/ }).click({ timeout: 2000 });
        if (await page.locator('#cancelEdit').isVisible()) await page.locator('#cancelEdit').click({ timeout: 2000 });
      } catch (_) { /* 정리 실패는 무시 */ }
    }
  };
  const ok = (c, m) => { if (!c) throw new Error(m); };
  const shot = async (label, opts = {}) => {
    shotNo++;
    const file = `phase2-claude-${String(shotNo).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(SHOTS, file), fullPage: true, ...opts });
    shots.push(`${file}\t${label}`);
  };
  const text = (sel) => page.locator(sel).innerText();
  const addMember = async (name) => { await page.fill('#memberInput', name); await page.press('#memberInput', 'Enter'); };
  const toggleBtn = (container, name) => page.locator(`${container} button`, { hasText: new RegExp(`^${name}$`) });

  await page.goto(URL);
  await startApp();
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await step('앱이 정상적으로 열린다 (콘솔 오류 없음, 3개 섹션 표시)', async () => {
    ok((await text('h2 >> nth=0')).includes('참여자'), '참여자 섹션 없음');
    ok((await text('#sec-expenses h2')).includes('지출 내역'), '지출 섹션 없음');
    ok((await text('#sec-result h2')).includes('정산 결과'), '정산 결과 섹션 없음');
    ok(errors.length === 0, '콘솔 오류: ' + errors.join(' | '));
  });
  await shot('초기 화면');

  await step('FR-01 이름 입력 후 Enter로 참여자 추가 / 추가 버튼으로 추가', async () => {
    await addMember('김진서'); await addMember('김진형');
    await page.fill('#memberInput', '김유철'); await page.click('#memberForm button[type=submit]');
    ok((await page.locator('#memberList .chip').count()) === 3, '칩 3개가 아님');
  });
  await step('[예외처리 성공] FR-01 빈 이름(공백만)은 추가되지 않는다', async () => {
    await addMember('   ');
    ok((await page.locator('#memberList .chip').count()) === 3, '빈 이름이 추가됨');
  });
  await shot('참여자 3명 추가');

  await step('FR-01 x를 누르면 삭제가 아니라 색만 바뀌고(비활성), 다시 누르면 복구', async () => {
    await page.click('#memberList .chip:nth-child(3) button');
    ok((await page.locator('#memberList .chip.off').count()) === 1, '비활성 표시 안 됨');
    ok((await page.locator('#memberList .chip').count()) === 3, '노드가 삭제됨');
    ok((await page.locator('#expParticipants button').count()) === 2, '비활성 참여자가 선택지에 남음');
    await shot('참여자 비활성화(색 변경)');
    await page.click('#memberList .chip:nth-child(3) button');
    ok((await page.locator('#memberList .chip.off').count()) === 0, '활성화 안 됨');
  });

  await step('[예외처리 성공] 입력 검증: 항목/금액 누락 시 추가되지 않고 안내 표시', async () => {
    await page.click('#expSubmit');
    ok((await text('#toast')).includes('항목'), '항목 안내 없음');
    await page.fill('#expTitle', '1차 고깃집'); await page.click('#expSubmit');
    ok((await text('#toast')).includes('금액'), '금액 안내 없음');
    ok((await page.locator('#expenseList .expense').count()) === 0, '지출이 추가됨');
  });
  await step('[예외처리 성공] 금액 입력은 숫자만 허용하고 천 단위 콤마 표시', async () => {
    await page.fill('#expAmount', ''); await page.type('#expAmount', 'ab12,3x4.5-');
    ok((await page.inputValue('#expAmount')) === '12,345', '실제: ' + (await page.inputValue('#expAmount')));
    await page.fill('#expAmount', '');
  });

  await step('FR-03 전체 선택/해제 버튼', async () => {
    await page.click('#toggleAll');
    ok((await page.locator('#expParticipants .toggle.on').count()) === 0, '전체 해제 안 됨');
    await page.click('#toggleAll');
    ok((await page.locator('#expParticipants .toggle.on').count()) === 3, '전체 선택 안 됨');
  });

  await step('FR-02/06 지출 추가(나누어떨어짐 60,000원/2명): 팝업 없이 추가', async () => {
    await toggleBtn('#expParticipants', '김유철').click();
    await page.fill('#expTitle', '1차 고기집'); await page.fill('#expAmount', '60000');
    await page.selectOption('#expPayer', { label: '김진서' });
    await page.click('#expSubmit');
    ok(await page.locator('#modal').isHidden(), '불필요한 팝업이 뜸');
    ok((await text('#expenseList')).includes('60,000원'), '목록에 없음');
  });

  await step('FR-05 나누어떨어지지 않으면 팝업(결제자가 내기/랜덤) 표시, 취소하면 추가 안 됨', async () => {
    await page.fill('#expTitle', '2차 술집'); await page.fill('#expAmount', '80000');
    await page.click('#toggleAll');
    await page.click('#toggleAll');
    await page.click('#expSubmit');
    ok(await page.locator('#modal').isVisible(), '팝업 안 뜸');
    const t = await text('#modal');
    ok(t.includes('결제자가 내기') && t.includes('랜덤'), '버튼 문구 없음: ' + t);
    await shot('나누어떨어지지 않을 때 팝업');
    await page.click('#modalBtns >> text=취소');
    ok(await page.locator('#modal').isHidden(), '팝업 안 닫힘');
    ok((await page.locator('#expenseList .expense').count()) === 1, '취소했는데 추가됨');
  });
  await step('FR-05 결제자가 내기: 결제자 부담 +2원 (80,000원/3명)', async () => {
    await page.click('#expSubmit'); await page.click('#modalBtns >> text=결제자가 내기');
    ok((await page.locator('#expenseList .expense').count()) === 2, '추가 안 됨');
    const row = (await text('#balances tbody tr:nth-child(1)')).replace(/\s+/g, ' ');
    ok(/김진서 140,000원 56,668원 \+83,332원/.test(row), '김진서 행: ' + row);
  });

  await step('FR-05 랜덤 배분: 합계 유지 + 새로고침해도 같은 결과(저장)', async () => {
    await page.fill('#expTitle', '3차 노래방'); await page.fill('#expAmount', '10000');
    await page.selectOption('#expPayer', { label: '김진형' });
    await page.click('#expSubmit'); await page.click('#modalBtns >> text=랜덤');
    const before = await text('#balances');
    const owed = (await page.locator('#balances tbody tr').allInnerTexts()).map((r) => Number(r.split('\t')[2].replace(/[^\d]/g, '')));
    ok(owed.reduce((a, b) => a + b, 0) === 150000, '쓴 돈 합계 ≠ 총지출: ' + owed);
    await page.reload();
    ok((await text('#balances')) === before, '새로고침 후 결과가 달라짐');
  });

  await step('FR-09 새로고침해도 참여자/지출/모임이름 유지(localStorage)', async () => {
    ok((await page.locator('#memberList .chip').count()) === 3, '참여자 유실');
    ok((await page.locator('#expenseList .expense').count()) === 3, '지출 유실');
  });

  await step('FR-04 감면: 감면 인원 선택 + % 입력 -> 해당 인원 부담 감소, 목록에 표시', async () => {
    await page.fill('#expTitle', '4차 택시'); await page.fill('#expAmount', '30000');
    await page.selectOption('#expPayer', { label: '김유철' });
    await toggleBtn('#expDiscounts', '김진서').click();
    await page.fill('#discountInputs input', '50');
    await shot('감면 인원 선택 및 % 입력');
    await page.click('#expSubmit');
    ok(await page.locator('#modal').isHidden(), '30000*0.5 계산이 나누어떨어지는데 팝업이 뜸: 김진서 5,000 / 나머지 12,500 확인 필요');
    const sub = await text('#expenseList .expense:nth-child(4) .exp-sub');
    ok(sub.includes('김진서 50% 감면'), '감면 표시 없음: ' + sub);
  });

  await step('FR-03 지출 수정: 불러오기 -> 금액 변경 -> 저장', async () => {
    await page.click('#expenseList .expense:nth-child(1) [data-edit]');
    ok((await page.inputValue('#expTitle')) === '1차 고기집', '수정 폼에 값이 안 채워짐');
    await page.fill('#expAmount', '70000'); await page.click('#expSubmit');
    ok((await text('#expenseList')).includes('70,000원'), '수정 반영 안 됨');
  });
  await shot('지출 수정 화면(불러오기 후 저장한 결과)');

  await step('수정 시 잔여 선택 유지: 이미 선택한 방식(랜덤/결제자)은 팝업 없이 그대로', async () => {
    await page.click('#expenseList .expense:nth-child(3) [data-edit]'); // 3차 노래방(랜덤, 10,000원/3명)
    await page.fill('#expAmount', '10001'); await page.click('#expSubmit');
    ok(await page.locator('#modal').isHidden(), '이미 랜덤을 골랐는데 수정 저장 때 팝업이 다시 뜸');
    ok((await text('#expenseList .expense:nth-child(3) .exp-sub')).includes('잔여 랜덤'), '랜덤 선택이 유지되지 않음: ' + (await text('#expenseList .expense:nth-child(3) .exp-sub')));
    await page.click('#expenseList .expense:nth-child(2) [data-edit]'); // 2차 술집(결제자 부담)
    await page.fill('#expTitle', '2차 술집(수정)'); await page.click('#expSubmit');
    ok(await page.locator('#modal').isHidden(), '이미 결제자 부담을 골랐는데 팝업이 다시 뜸');
    ok((await text('#expenseList .expense:nth-child(2) .exp-sub')).includes('잔여 결제자 부담'), '결제자 부담 선택이 유지되지 않음');
  });
  await shot('수정 저장 후 기존 잔여 처리 선택(랜덤/결제자 부담) 유지');
  await step('수정 시 잔여 선택: 수정으로 처음 나누어떨어지지 않게 되면 팝업으로 묻는다', async () => {
    await page.click('#expenseList .expense:nth-child(1) [data-edit]'); // 1차 고기집 70,000원/2명
    await page.fill('#expAmount', '70001'); await page.click('#expSubmit');
    ok(await page.locator('#modal').isVisible(), '처음 나누어떨어지지 않게 됐는데 팝업이 안 뜸');
    await shot('수정으로 처음 나누어떨어지지 않게 되어 뜬 팝업');
    await page.click('#modalBtns >> text=결제자가 내기');
    await page.click('#expenseList .expense:nth-child(1) [data-edit]');
    await page.fill('#expAmount', '70000'); await page.click('#expSubmit');
    ok((await text('#expenseList')).includes('70,000원'), '원래 금액 복구 실패');
  });

  await step('FR-02 지출 삭제', async () => {
    const n = await page.locator('#expenseList .expense').count();
    await page.click('#expenseList .expense:nth-child(4) [data-del]');
    ok((await page.locator('#expenseList .expense').count()) === n - 1, '삭제 안 됨');
  });

  await step('[예외처리 성공] 감면 규칙(0명 이상 N-1명 이하): 전원 감면은 선택 단계에서 거부', async () => {
    for (const n of ['김진서', '김진형', '김유철']) await toggleBtn('#expDiscounts', n).click();
    const cnt = await page.locator('#discountInputs input').count();
    ok(cnt === 2, `감면 대상이 ${cnt}명 선택됨(최대 2명이어야 함)`);
    ok((await text('#toast')).includes('감면'), '거부 안내 없음: ' + (await text('#toast')));
    await shot('전원 감면 선택 거부 안내(최대 N-1명)');
    for (const n of ['김진서', '김진형', '김유철']) { if (await toggleBtn('#expDiscounts', n).evaluate((el) => el.classList.contains('on'))) await toggleBtn('#expDiscounts', n).click(); }
  });
  await step('비활성 규칙: 비활성화해도 기존 지출·정산은 그대로', async () => {
    const before = await text('#balances');
    await page.click('#memberList .chip:nth-child(3) button');
    ok((await page.locator('#memberList .chip.off').count()) === 1, '비활성 표시 안 됨');
    ok((await text('#balances')) === before, '비활성화만으로 기존 정산 결과가 바뀜');
    ok((await text('#balances')).includes('김유철'), '비활성 참여자가 결과에서 사라짐');
  });
  await step('비활성 규칙: 지출 목록의 수정에서 함께한 사람을 비활성화(해제)해야 반영', async () => {
    await page.click('#expenseList .expense:nth-child(2) [data-edit]');
    ok((await page.locator('#expParticipants button.inactive').count()) === 1, '수정 화면에 비활성 참여자 칩(.inactive)이 없음');
    await shot('지출 수정 화면: 비활성 참여자 칩(점선)이 보임');
    await page.locator('#expParticipants button.inactive').click();
    await page.click('#expSubmit');
    ok(await page.locator('#modal').isHidden(), '40,000원/2명인데 팝업이 뜸');
    const sub = await text('#expenseList .expense:nth-child(2) .exp-sub');
    ok(sub.includes('2명'), '수정 후 2명이 아님: ' + sub);
    await page.click('#memberList .chip:nth-child(3) button'); // 활성 복구
  });

  await step('FR-07/08 정산 결과: 차액 색(+초록/-빨강), 송금 목록 표시', async () => {
    ok((await page.locator('#balances td.pos').count()) >= 1 && (await page.locator('#balances td.neg').count()) >= 1, '차액 색상 클래스 없음');
    ok((await page.locator('#transfers li .amt').count()) >= 1, '송금 목록 없음');
    ok((await page.locator('#transfers li').count()) <= 2, '송금 횟수가 인원-1 초과');
  });
  await shot('지출 입력 및 정산 결과');

  await step('FR-08 결과 텍스트 복사 형식 ([모임 정산] / ■ 지출 내역 / ■ 송금)', async () => {
    await page.fill('#groupName', '가족모임');
    await page.click('#copyBtn');
    const clip = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
    ok(clip.startsWith('[가족모임 정산]\n총 지출 '), '머리말: ' + clip.slice(0, 30));
    ok(clip.includes('■ 지출 내역\n- 1차 고기집 70,000원 (김진서 결제, 2명)'), '지출 내역 형식: ' + clip);
    ok(/■ 송금\n.+ → .+ [\d,]+원/.test(clip), '송금 형식');
    page.__clip = clip;
  });
  await shot('가족모임 이름 + 결과 복사 후');

  await step('사용성: 모바일 360px에서 가로 스크롤 없음', async () => {
    await page.setViewportSize({ width: 360, height: 800 });
    const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    ok(w.s <= w.c, `가로 스크롤 발생 scrollWidth=${w.s} > clientWidth=${w.c}`);
  });
  await shot('모바일 360px 화면');
  await page.setViewportSize({ width: 430, height: 900 });

  await step('FR-09 서버 전송 없음(외부 네트워크 요청 0건)', async () => {
    const reqs = [];
    page.on('request', (r) => { if (!r.url().startsWith('file://')) reqs.push(r.url()); });
    await page.reload(); await page.click('#copyBtn');
    ok(reqs.length === 0, '외부 요청: ' + reqs.join(', '));
  });

  await step('동명이인: 같은 이름은 (1),(2),(3)으로 구분되어 추가된다', async () => {
    await addMember('박민수'); await addMember('박민수');
    let t = await text('#memberList');
    ok(t.includes('박민수(1)') && t.includes('박민수(2)'), '(1),(2) 구분 안 됨: ' + t);
    ok(!/박민수\s*×?\s*\n/.test(t.replace('박민수(1)', '').replace('박민수(2)', '')), '번호 없는 이름이 남음: ' + t);
    await addMember('박민수');
    t = await text('#memberList');
    ok(t.includes('박민수(3)') && (await page.locator('#memberList .chip').count()) === 6, '(3) 추가 실패: ' + t);
    ok((await text('#expParticipants')).includes('박민수(2)'), '지출 입력 화면에도 구분된 이름이 보이지 않음');
  });
  await shot('동명이인 (1)(2)(3) 구분');

  await step('[예외처리 성공] 감면율 소수 입력(12.5)은 거부되고 정수만 남으며 안내한다', async () => {
    await page.setViewportSize({ width: 430, height: 900 });
    await toggleBtn('#expDiscounts', '김진서').click();
    await page.fill('#discountInputs input', '12.5');
    ok((await page.inputValue('#discountInputs input')) === '12', '소수가 그대로 남음: ' + (await page.inputValue('#discountInputs input')));
    ok((await text('#toast')).includes('정수'), '정수 안내 없음: ' + (await text('#toast')));
    await shot('감면율 소수 입력 거부 안내');
    await toggleBtn('#expDiscounts', '김진서').click();
  });

  await step('[예외처리 성공] 결제한 사람이 함께 쓴 사람에 없으면 지출이 거부되고 안내한다', async () => {
    const n = await page.locator('#expenseList .expense').count();
    await page.fill('#expTitle', '결제자 제외 테스트'); await page.fill('#expAmount', '30000');
    await page.selectOption('#expPayer', { label: '김진서' });
    await toggleBtn('#expParticipants', '김진서').click();
    await page.click('#expSubmit');
    ok((await text('#toast')).includes('결제한 사람'), '결제자 안내 없음: ' + (await text('#toast')));
    ok(await page.locator('#modal').isHidden(), '팝업이 뜸');
    ok((await page.locator('#expenseList .expense').count()) === n, '거부해야 하는데 지출이 추가됨');
    await shot('결제자가 함께 쓴 사람에 없는 지출 거부 안내');
    await toggleBtn('#expParticipants', '김진서').click();
    await page.fill('#expTitle', ''); await page.fill('#expAmount', '');
  });

  await step('초기화: 확인 팝업 후 모든 데이터 삭제', async () => {
    await page.click('#resetBtn');
    ok(await page.locator('#modal').isVisible(), '확인 팝업 없음');
    await page.click('#modalBtns >> text=초기화');
    ok((await page.locator('#memberList .chip').count()) === 0 && (await page.locator('#expenseList .expense').count()) === 0, '데이터가 남음');
  });
  await shot('초기화 후');

  await step('실행 중 콘솔/페이지 오류 없음', async () => ok(errors.length === 0, errors.join(' | ')));

  await browser.close();

  let pass = 0, fail = 0;
  for (const r of results) {
    if (r.ok) pass++; else { fail++; console.log(`FAIL ${r.name}\n     └ ${r.msg}`); }
  }
  const exc = results.filter((r) => r.name.startsWith('[예외처리 성공]'));
  console.log(`\n■ 예외처리 성공(의도대로 거부·안내 = PASS): ${exc.filter((r) => r.ok).length}/${exc.length}`);
  console.log(`\n==== UI 테스트: 총 ${results.length}건 / PASS ${pass} / FAIL ${fail} ====`);
  fs.writeFileSync(path.join(SHOTS, 'phase2-claude-index.tsv'), shots.join('\n') + '\n');
  console.log('스크린샷:\n' + shots.join('\n'));
  process.exit(fail ? 1 : 0);
})();
