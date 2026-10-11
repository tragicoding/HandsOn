// Dutch-Pay 정산 테스트 (tester agent / .claude/skills/test.md 기준)
// 실행: node scripts/test/run_tests.js   (Node 16+, 외부 의존성 없음)
// 소스는 수정하지 않으며, 독립 계산한 예상값(oracle)과 src/settle.js 결과를 비교한다.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = path.resolve(__dirname, '..', '..', 'src');
const Settle = require(path.join(SRC, 'settle.js'));

// ---------- 미니 테스트 러너 ----------
const results = [];
function test(group, name, fn) {
  try {
    fn();
    results.push({ group, name, ok: true });
  } catch (e) {
    results.push({ group, name, ok: false, msg: e.message });
  }
}
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label || ''} 예상=${b} 실제=${a}`);
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const sum = (arr) => arr.reduce((s, v) => s + v, 0);
const isInt = Number.isInteger;

// 재현 가능한 난수 (mulberry32)
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- oracle: requirements.md 비기능 요구 6번 알고리즘의 독립 구현 ----------
// discounts: { id: 감면율(%) }, mode: 'payer' | 'random'
function oracleShares(total, ids, payer, discounts = {}, mode = 'payer', rand = rng(1)) {
  const n = ids.length;
  const base = total / n;
  const disc = ids.filter((id) => (discounts[id] || 0) > 0);
  const rest = ids.filter((id) => !(discounts[id] > 0));
  let cut = 0;
  const raw = {};
  for (const id of disc) { const d = base * (discounts[id] / 100); raw[id] = base - d; cut += d; }
  for (const id of rest) raw[id] = base + (rest.length ? cut / rest.length : 0);
  if (!rest.length) for (const id of disc) raw[id] = base; // 전원 감면이면 재분배 불가 -> 기본액
  const shares = {};
  for (const id of ids) shares[id] = Math.floor(raw[id] + 1e-9);
  let remainder = total - sum(Object.values(shares));
  if (mode === 'payer') {
    shares[ids.includes(payer) ? payer : ids[0]] += remainder;
  } else {
    const order = ids.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (let i = 0; remainder > 0; i = (i + 1) % order.length, remainder--) shares[order[i]] += 1;
  }
  return shares;
}

function oracleBalances(members, expenses, mode = 'payer') {
  const b = {};
  members.forEach((m) => (b[m.id] = { paid: 0, owed: 0 }));
  for (const e of expenses) {
    b[e.payer].paid += e.amount;
    const s = oracleShares(e.amount, e.participants, e.payer, e.discounts || {}, mode);
    for (const id in s) b[id].owed += s[id];
  }
  return b;
}

// ---------- 시나리오 생성 ----------
const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: 'm' + i, name: '참여자' + i }));
const ids = (ms) => ms.map((m) => m.id);
function scenario(n, kind) {
  const ms = mk(n), all = ids(ms), half = all.slice(0, Math.ceil(n / 2));
  const cases = {
    'single-divisible': [{ title: '식사', amount: n * 10000, payer: all[0], participants: all }],
    'single-indivisible': [{ title: '식사', amount: n * 10000 + 7, payer: all[n - 1], participants: all }],
    'multi-payer': [
      { title: '식사', amount: 123457, payer: all[0], participants: all },
      { title: '카페', amount: 31900, payer: all[1], participants: half },
      { title: '술집', amount: 250003, payer: all[n - 1], participants: all },
      { title: '택시', amount: 18700, payer: all[2], participants: all.slice(1, 4) },
    ],
    'partial': [
      { title: '택시', amount: 20000, payer: all[1], participants: half },
      { title: '술집', amount: 99999, payer: all[0], participants: all.slice(1) },
    ],
  };
  return { members: ms, expenses: cases[kind] };
}

const SIZES = [5, 10, 15, 20];
const KINDS = ['single-divisible', 'single-indivisible', 'multi-payer', 'partial'];

// ===================== A. 정산 불변식 (src/settle.js) =====================
for (const n of SIZES) for (const kind of KINDS) {
  const label = `${n}명/${kind}`;
  const { members, expenses } = scenario(n, kind);
  const total = sum(expenses.map((e) => e.amount));
  const bal = Settle.computeBalances(members, expenses);
  const transfers = Settle.computeTransfers(bal);

  test('A.불변식', `${label} 총지출 = 부담금 합계`, () => eq(sum(bal.map((b) => b.owed)), total));
  test('A.불변식', `${label} 총지출 = 결제금액 합계`, () => eq(sum(bal.map((b) => b.paid)), total));
  test('A.불변식', `${label} 차액 합 = 0`, () => eq(sum(bal.map((b) => b.net)), 0));
  test('A.불변식', `${label} 모든 금액 원 단위 정수`, () => {
    assert(bal.every((b) => isInt(b.paid) && isInt(b.owed) && isInt(b.net)), '정수 아닌 값 존재');
    assert(transfers.every((t) => isInt(t.amount) && t.amount > 0), '송금액이 양의 정수가 아님');
  });
  test('A.불변식', `${label} 차액 = 결제 - 부담`, () => assert(bal.every((b) => b.net === b.paid - b.owed), '차액 불일치'));
  test('A.송금', `${label} 송금 횟수 <= 인원-1`, () => assert(transfers.length <= n - 1, `횟수 ${transfers.length} > ${n - 1}`));
  test('A.송금', `${label} 송금 후 채권·채무 모두 0`, () => {
    const left = Object.fromEntries(bal.map((b) => [b.id, b.net]));
    for (const t of transfers) { left[t.from] += t.amount; left[t.to] -= t.amount; }
    assert(Object.values(left).every((v) => v === 0), '송금 반영 후 잔액 존재: ' + JSON.stringify(left));
  });
  test('A.송금', `${label} 송금자는 채무자, 수령자는 채권자`, () => {
    const net = Object.fromEntries(bal.map((b) => [b.id, b.net]));
    assert(transfers.every((t) => net[t.from] < 0 && net[t.to] > 0), '방향 오류');
  });
  test('A.재현성', `${label} 동일 입력 동일 결과`, () => {
    eq(Settle.computeBalances(members, expenses), bal);
    eq(Settle.computeTransfers(Settle.computeBalances(members, expenses)), transfers);
  });
}

// ===================== B. oracle 대조 (잔여 처리: 결제자가 부담) =====================
// requirements 6번: 몫을 균등 배분하고 나머지는 선택한 방식으로 처리. 기본값은 '결제자가 부담'으로 비교한다.
for (const n of SIZES) for (const kind of KINDS) {
  const { members, expenses } = scenario(n, kind);
  const exp = oracleBalances(members, expenses, 'payer');
  const act = Object.fromEntries(Settle.computeBalances(members, expenses).map((b) => [b.id, b]));
  test('B.oracle(결제자 부담)', `${n}명/${kind} 개인별 부담 금액`, () => {
    const bad = members.filter((m) => act[m.id].owed !== exp[m.id].owed)
      .map((m) => `${m.id}: 예상 ${exp[m.id].owed} / 실제 ${act[m.id].owed}`);
    assert(!bad.length, bad.slice(0, 3).join(' | ') + (bad.length > 3 ? ` 외 ${bad.length - 3}명` : ''));
  });
}

// ===================== C. oracle 자체 검증 (감면·잔여 알고리즘) =====================
test('C.oracle', '감면 20%: 합계=총액, 정수', () => {
  const s = oracleShares(100000, ['a', 'b', 'c', 'd', 'e'], 'a', { a: 20 });
  eq(sum(Object.values(s)), 100000); assert(Object.values(s).every(isInt), '비정수');
  assert(s.a < s.b, '감면 대상 부담이 더 커짐');
});
test('C.oracle', '감면 100%: 감면 대상 0원', () => eq(oracleShares(40000, ['a', 'b', 'c', 'd'], 'b', { a: 100 }).a, 0));
test('C.oracle', '감면 0%: 균등', () => {
  const s = oracleShares(40000, ['a', 'b', 'c', 'd'], 'a', { a: 0 });
  eq(Object.values(s), [10000, 10000, 10000, 10000]);
});
test('C.oracle', '랜덤 배분: 합계=총액이고 잔여는 1원씩', () => {
  const s = oracleShares(100003, ['a', 'b', 'c', 'd', 'e'], 'a', {}, 'random', rng(7));
  eq(sum(Object.values(s)), 100003);
  assert(Math.max(...Object.values(s)) - Math.min(...Object.values(s)) <= 1, '1원 초과 차이');
});

// ===================== D. 감면·잔여 처리 기능 (PRD FR-04, FR-05) =====================
const settleSrc = fs.readFileSync(path.join(SRC, 'settle.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
const htmlSrc = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const logicSrc = settleSrc + '\n' + appSrc;
const has = (src, re) => re.test(src);

test('D.감면', 'FR-04 감면율(%) 계산 로직 존재', () => assert(has(logicSrc, /discount|감면|reduc/i), 'settle.js/app.js에 감면 로직이 없음'));
test('D.감면', 'FR-04 감면 인원 선택·% 입력 UI 존재', () => assert(has(htmlSrc + appSrc, /감면/), 'UI에 감면 항목 없음'));
test('D.감면', 'FR-04 감면 20% 적용 결과(5명/100,000원)', () => {
  const ms = mk(5);
  const e = { title: '술', amount: 100000, payer: 'm0', participants: ids(ms), discounts: { m1: 20 }, discount: { m1: 20 } };
  const act = Settle.computeBalances(ms, [e]).find((b) => b.id === 'm1').owed;
  eq(act, 16000, '감면 대상 m1 부담액');
});
test('D.잔여', 'FR-05 잔여 처리 선택(결제자가 부담/랜덤) 로직 존재', () => assert(has(logicSrc, /random|랜덤|remainder|잔여/i), '잔여 처리 로직 없음'));
test('D.잔여', 'FR-05 나누어떨어지지 않을 때 팝업(결제자가 내기/랜덤) 존재', () => assert(has(htmlSrc + appSrc, /결제자가\s*(내기|부담)/) && has(htmlSrc + appSrc, /랜덤/), '팝업 문구 없음'));
test('D.잔여', 'FR-05 랜덤 배분 결과 저장(재계산 시 동일)', () => assert(has(logicSrc, /seed|shuffle|랜덤.*저장|random.*save/i), '랜덤 결과 저장 로직 없음'));
test('D.잔여', '잔여를 결제자가 부담: 결제자가 마지막일 때 1원 몫이 결제자에게', () => {
  const ms = mk(3);
  const e = { title: '식사', amount: 10, payer: 'm2', participants: ids(ms), remainderMode: 'payer', mode: 'payer' };
  const bal = Settle.computeBalances(ms, [e]);
  eq(bal.find((b) => b.id === 'm2').owed, 4, '결제자 m2 부담액(3+3+4)');
});

// ===================== E. 예외·경계 조건 =====================
test('E.예외', '참여자 0명 지출은 무시되고 NaN이 없음', () => {
  const ms = mk(3);
  const bal = Settle.computeBalances(ms, [{ title: 'x', amount: 1000, payer: 'm0', participants: [] }]);
  assert(bal.every((b) => b.paid === 0 && b.owed === 0 && !Number.isNaN(b.net)), '값 오염');
});
test('E.예외', '삭제된 결제자 지출은 무시', () => {
  const ms = mk(3);
  const bal = Settle.computeBalances(ms, [{ title: 'x', amount: 1000, payer: 'ghost', participants: ['m0', 'm1'] }]);
  eq(sum(bal.map((b) => b.paid + b.owed)), 0);
});
test('E.예외', '삭제된 참여자 id는 정산에서 제외', () => {
  const ms = mk(3);
  const bal = Settle.computeBalances(ms, [{ title: 'x', amount: 9000, payer: 'm0', participants: ['m0', 'm1', 'ghost'] }]);
  eq(sum(bal.map((b) => b.owed)), 9000);
});
test('E.예외', '금액 0원 지출: 송금 없음', () => {
  const ms = mk(3);
  eq(Settle.computeTransfers(Settle.computeBalances(ms, [{ title: 'x', amount: 0, payer: 'm0', participants: ids(ms) }])), []);
});
test('E.예외', '참여자 1명 모임: 송금 없음', () => {
  const ms = mk(1);
  eq(Settle.computeTransfers(Settle.computeBalances(ms, [{ title: 'x', amount: 5000, payer: 'm0', participants: ['m0'] }])), []);
});
test('E.예외', '금액이 인원보다 작을 때(1원/5명) 합계 유지', () => {
  const ms = mk(5);
  const bal = Settle.computeBalances(ms, [{ title: 'x', amount: 1, payer: 'm4', participants: ids(ms) }]);
  eq(sum(bal.map((b) => b.owed)), 1);
});
test('E.예외', '매우 큰 금액(9,999,999,999원/20명) 정수·합계 유지', () => {
  const ms = mk(20), total = 9999999999;
  const bal = Settle.computeBalances(ms, [{ title: 'x', amount: total, payer: 'm0', participants: ids(ms) }]);
  eq(sum(bal.map((b) => b.owed)), total);
  assert(bal.every((b) => isInt(b.owed)), '비정수');
});
test('E.예외', '소수 금액 입력(1000.5원)은 원 단위 정수로 처리되어야 함', () => {
  const ms = mk(3);
  const bal = Settle.computeBalances(ms, [{ title: 'x', amount: 1000.5, payer: 'm0', participants: ids(ms) }]);
  assert(bal.every((b) => isInt(b.owed) && isInt(b.paid)), '소수 금액이 그대로 계산됨');
});
test('E.예외', '음수 금액은 거부/무시되어야 함', () => {
  const ms = mk(3);
  const bal = Settle.computeBalances(ms, [{ title: 'x', amount: -3000, payer: 'm0', participants: ids(ms) }]);
  assert(bal.every((b) => b.paid >= 0 && b.owed >= 0), '음수 금액이 그대로 계산됨');
});
test('E.예외', '참여자 비활성화 후 재계산: 해당 참여자 부담 0', () => {
  const ms = mk(5), e = { title: '식사', amount: 50000, payer: 'm0', participants: ['m0', 'm1', 'm2', 'm4'] };
  const bal = Settle.computeBalances(ms, [e]);
  eq(bal.find((b) => b.id === 'm3').owed, 0);
  eq(sum(bal.map((b) => b.owed)), 50000);
});
test('E.예외', '금액 수정 후 재계산 반영', () => {
  const ms = mk(4), mkE = (a) => [{ title: 'x', amount: a, payer: 'm0', participants: ids(ms) }];
  eq(sum(Settle.computeBalances(ms, mkE(40000)).map((b) => b.owed)), 40000);
  eq(sum(Settle.computeBalances(ms, mkE(52000)).map((b) => b.owed)), 52000);
});
test('E.예외', '항목 삭제 후 재계산: 지출 0건이면 전원 차액 0', () => {
  const ms = mk(4);
  assert(Settle.computeBalances(ms, []).every((b) => b.net === 0), '잔액 존재');
});
test('E.PRD예시5', '번갈아 결제(A,B,C,D 순환): 송금 횟수 최소화', () => {
  const ms = mk(4), a = ids(ms);
  const ex = a.map((p, i) => ({ title: 'r' + i, amount: 40000, payer: p, participants: a }));
  eq(Settle.computeTransfers(Settle.computeBalances(ms, ex)), [], '모두 같은 금액이면 송금 없음');
});

// ===================== F. 랜덤 속성 검사 (재현 가능 시드) =====================
{
  const r = rng(20261011);
  let bad = '';
  for (let k = 0; k < 300 && !bad; k++) {
    const n = 5 + Math.floor(r() * 16), ms = mk(n), a = ids(ms);
    const ex = Array.from({ length: 1 + Math.floor(r() * 5) }, (_, i) => {
      const parts = a.filter(() => r() < 0.7); if (!parts.length) parts.push(a[0]);
      return { title: 'e' + i, amount: 1 + Math.floor(r() * 500000), payer: a[Math.floor(r() * n)], participants: parts };
    });
    const total = sum(ex.map((e) => e.amount)), bal = Settle.computeBalances(ms, ex), tr = Settle.computeTransfers(bal);
    const left = Object.fromEntries(bal.map((b) => [b.id, b.net]));
    tr.forEach((t) => { left[t.from] += t.amount; left[t.to] -= t.amount; });
    if (sum(bal.map((b) => b.owed)) !== total) bad = `케이스 ${k}: 부담 합계 ≠ 총지출`;
    else if (sum(bal.map((b) => b.net)) !== 0) bad = `케이스 ${k}: 차액 합 ≠ 0`;
    else if (tr.length > n - 1) bad = `케이스 ${k}: 송금 ${tr.length}회 > ${n - 1}`;
    else if (Object.values(left).some((v) => v !== 0)) bad = `케이스 ${k}: 송금 후 잔액 존재`;
  }
  test('F.랜덤300', '5~20명 무작위 300건: 합계·차액·송금횟수·상계', () => assert(!bad, bad));
}

// ===================== G. 앱 기능 (정적 점검) =====================
test('G.앱', 'JS 문법 오류 없음(settle.js, app.js)', () => {
  for (const f of ['settle.js', 'app.js']) execFileSync(process.execPath, ['--check', path.join(SRC, f)]);
});
test('G.앱', 'index.html 필수 요소 id 존재', () => {
  const need = ['memberForm', 'memberInput', 'memberList', 'expenseForm', 'expTitle', 'expAmount', 'expPayer', 'expParticipants', 'toggleAll', 'expenseList', 'balances', 'transfers', 'copyBtn'];
  const miss = need.filter((id) => !new RegExp(`id=["']${id}["']`).test(htmlSrc));
  assert(!miss.length, '누락: ' + miss.join(', '));
});
test('G.앱', 'app.js가 참조하는 id가 index.html에 모두 존재', () => {
  const used = [...new Set([...appSrc.matchAll(/\$\('([A-Za-z0-9_]+)'\)/g)].map((m) => m[1]))];
  const miss = used.filter((id) => !new RegExp(`id=["']${id}["']`).test(htmlSrc));
  assert(!miss.length, '누락: ' + miss.join(', '));
});
test('G.앱', 'FR-01 참여자 비활성화(노드 색만 변경) 지원', () => assert(has(appSrc, /inactive|disabled|비활성|toggle/i) && !has(appSrc, /state\.members\s*=\s*state\.members\.filter/), '참여자 삭제만 있고 비활성화 없음'));
test('G.앱', 'FR-01 Enter/추가 버튼으로 참여자 추가(form submit)', () => assert(has(htmlSrc, /<form[^>]*id=["']memberForm/) && has(appSrc, /memberForm['"]\)\.addEventListener\(['"]submit/), 'submit 처리 없음'));
test('G.앱', 'FR-03 전체 선택/해제 버튼', () => assert(has(htmlSrc, /id=["']toggleAll/) && has(appSrc, /toggleAll/), '없음'));
test('G.앱', 'FR-08 결과 텍스트 복사(clipboard)', () => assert(has(appSrc, /clipboard\.writeText/), '없음'));
test('G.앱', 'FR-09 localStorage 저장/복원', () => assert(has(appSrc, /localStorage\.setItem/) && has(appSrc, /localStorage\.getItem/), '없음'));
test('G.앱', 'FR-09 입력값(금액) 숫자 외 문자 차단', () => assert(has(appSrc, /replace\(\/\[\^\\d\]\/g/), '없음'));
test('G.앱', '사용성 viewport 메타 태그(모바일)', () => assert(has(htmlSrc, /name=["']viewport["']/), '없음'));
test('G.앱', '서버 전송 없음(fetch/XMLHttpRequest 미사용)', () => assert(!has(logicSrc, /fetch\(|XMLHttpRequest|WebSocket/), '네트워크 호출 존재'));
test('G.앱', '개인별 부담 근거(지출 항목별 내역) 표시', () => assert(has(appSrc, /근거|breakdown/), '계산 근거 표시 없음(PRD: 투명한 정산 결과)'));

// ---------- 결과 출력 ----------
const groups = [...new Set(results.map((r) => r.group))];
let pass = 0, fail = 0;
for (const g of groups) {
  const rs = results.filter((r) => r.group === g);
  console.log(`\n■ ${g}  (${rs.filter((r) => r.ok).length}/${rs.length} PASS)`);
  for (const r of rs) {
    if (r.ok) pass++; else fail++;
    if (!r.ok) console.log(`  FAIL  ${r.name}\n        └ ${r.msg}`);
  }
}
console.log(`\n==== 결과: 총 ${results.length}건 / PASS ${pass} / FAIL ${fail} ====`);
console.log('미실행: 브라우저 UI 동작(모바일 360px, 레퍼런스 화면 일치, 팝업 상호작용)은 이 스크립트로 검증하지 않음');
process.exit(fail ? 1 : 0);
