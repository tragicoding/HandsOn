// phase2-doc 정산 로직 테스트 (src/settle.js)
// 실행: node scripts/test/phase2_doc_logic.test.js
// 예상값은 requirements.md 비기능 요구 6번 알고리즘을 별도로 구현(oracle)해 비교한다.
const path = require('path');
const SRC = path.resolve(__dirname, '..', '..', 'src');
const fs = require('fs');
const S = require(path.join(SRC, 'settle.js'));
// 입력 검증 모듈(src/validate.js). 없으면 관련 테스트가 FAIL로 기록된다.
let V = null;
try { V = require(path.join(SRC, 'validate.js')); } catch (e) { V = null; }

// 예외처리로 지정한 입력이 의도대로 거부·안내되면 PASS (test skill: "예외처리로 지정한 것이 의도대로 에러처리되었다면 PASS")
const EXC = 'X.예외처리 성공(의도대로 거부·안내 = PASS)';
const results = [];
const test = (group, name, fn) => {
  try { fn(); results.push({ group, name, ok: true }); } catch (e) { results.push({ group, name, ok: false, msg: e.message }); }
};
const assert = (c, m) => { if (!c) throw new Error(m); };
const eq = (a, b, l) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${l || ''} 예상=${JSON.stringify(b)} 실제=${JSON.stringify(a)}`); };
const sum = (a) => a.reduce((s, v) => s + v, 0);
const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: 'm' + i, name: 'P' + i, active: true }));
const ids = (ms) => ms.map((m) => m.id);

// ---- oracle (부동소수점 + 보정, S와 다른 방식) ----
function oracle(total, pids, payer, disc, mode) {
  const n = pids.length, base = total / n;
  const dIds = pids.filter((i) => disc[i] > 0), rIds = pids.filter((i) => !(disc[i] > 0));
  const raw = {};
  if (!dIds.length || !rIds.length) pids.forEach((i) => (raw[i] = base));
  else {
    const cut = sum(dIds.map((i) => base * disc[i] / 100));
    dIds.forEach((i) => (raw[i] = base * (1 - disc[i] / 100)));
    rIds.forEach((i) => (raw[i] = base + cut / rIds.length));
  }
  const sh = {};
  pids.forEach((i) => (sh[i] = Math.floor(raw[i] + 1e-7)));
  const rest = total - sum(Object.values(sh));
  if (mode === 'payer') sh[payer] = (sh[payer] || 0) + rest;
  return { sh, rest };
}

// ===== A. 기본 정산: 인원 x 시나리오 =====
for (const n of [5, 10, 15, 20]) {
  const ms = mk(n), all = ids(ms), half = all.slice(0, Math.ceil(n / 2));
  const scen = {
    '단일지출/나누어떨어짐': [{ id: 'e1', title: '식사', amount: n * 12000, payer: all[0], participants: all, mode: 'payer' }],
    '단일지출/나머지있음': [{ id: 'e1', title: '식사', amount: n * 12000 + 7, payer: all[n - 1], participants: all, mode: 'payer' }],
    '여러지출/여러결제자/일부참여': [
      { id: 'e1', title: '식사', amount: 123457, payer: all[0], participants: all, mode: 'payer' },
      { id: 'e2', title: '카페', amount: 31900, payer: all[1], participants: half, mode: 'payer' },
      { id: 'e3', title: '술집', amount: 250003, payer: all[n - 1], participants: all.slice(1), mode: 'random', seed: 42 },
      { id: 'e4', title: '택시', amount: 18700, payer: all[2], participants: all.slice(1, 4), mode: 'payer' },
    ],
  };
  for (const [name, ex] of Object.entries(scen)) {
    const label = `${n}명 ${name}`;
    const r = S.computeAll(ms, ex);
    const total = sum(ex.map((e) => e.amount));
    test('A.불변식', `${label}: 총지출 = 부담합 = 결제합`, () => { eq(r.total, total); eq(sum(r.balances.map((b) => b.owed)), total); eq(sum(r.balances.map((b) => b.paid)), total); });
    test('A.불변식', `${label}: 차액합 0, 모두 정수`, () => {
      eq(sum(r.balances.map((b) => b.net)), 0);
      assert(r.balances.every((b) => [b.paid, b.owed, b.net].every(Number.isInteger)), '정수 아님');
    });
    test('A.송금', `${label}: 송금 횟수 <= 인원-1, 상계 후 0원`, () => {
      assert(r.transfers.length <= n - 1, `송금 ${r.transfers.length}회`);
      const left = Object.fromEntries(r.balances.map((b) => [b.id, b.net]));
      r.transfers.forEach((t) => { assert(Number.isInteger(t.amount) && t.amount > 0, '송금액'); left[t.from] += t.amount; left[t.to] -= t.amount; });
      assert(Object.values(left).every((v) => v === 0), '상계 후 잔액 존재');
    });
    test('A.재현성', `${label}: 동일 입력/저장된 seed -> 동일 결과`, () => eq(S.computeAll(ms, ex), r));
    if (!ex.some((e) => e.mode === 'random')) {
      test('A.oracle', `${label}: 개인별 부담 금액 일치`, () => {
        const exp = {};
        ms.forEach((m) => (exp[m.id] = 0));
        ex.forEach((e) => { const o = oracle(e.amount, e.participants, e.payer, e.discounts || {}, 'payer'); for (const k in o.sh) exp[k] += o.sh[k]; });
        eq(Object.fromEntries(r.balances.map((b) => [b.id, b.owed])), exp);
      });
    }
  }
}

// ===== B. 감면 =====
const ms5 = mk(5), a5 = ids(ms5);
for (const pct of [0, 20, 50, 100]) {
  for (const total of [100000, 100003]) {
    test('B.감면', `5명 ${total}원, m1 ${pct}% 감면`, () => {
      const e = { amount: total, payer: 'm0', participants: a5, discounts: { m1: pct }, mode: 'payer' };
      const sh = S.expenseShares(e, a5);
      const o = oracle(total, a5, 'm0', { m1: pct }, 'payer');
      eq(sum(Object.values(sh)), total, '합계');
      eq(sh, o.sh, '개인별');
      if (pct > 0) assert(sh.m1 <= Math.floor(total / 5), '감면 대상 부담이 줄지 않음');
    });
  }
}
test('B.감면', '감면 100% -> 감면 대상 0원, 나머지 균등 (4명 40,000원 중 1명)', () => {
  const sh = S.expenseShares({ amount: 40000, payer: 'm1', participants: ['m0', 'm1', 'm2', 'm3'], discounts: { m0: 100 }, mode: 'payer' }, ['m0', 'm1', 'm2', 'm3']);
  eq(sh.m0, 0); eq(sum(Object.values(sh)), 40000);
});
test('B.감면', '여러 명 감면 (m1 20%, m2 50%) 합계 유지', () => {
  const e = { amount: 99999, payer: 'm0', participants: a5, discounts: { m1: 20, m2: 50 }, mode: 'payer' };
  eq(sum(Object.values(S.expenseShares(e, a5))), 99999);
});
test('B.감면', 'PRD 예시4: 운전자 20% 감면 후 N등분 (4명 100,000원)', () => {
  const ids4 = ['d', 'a', 'b', 'c'];
  const sh = S.expenseShares({ amount: 100000, payer: 'a', participants: ids4, discounts: { d: 20 }, mode: 'payer' }, ids4);
  eq(sh.d, 20000); eq(sh.a + sh.b + sh.c, 80000);
});
test('B.감면', '큰 금액(9,999,999,999원/20명, 감면 33%)도 합계 정확', () => {
  const ms = mk(20), a = ids(ms);
  eq(sum(Object.values(S.expenseShares({ amount: 9999999999, payer: 'm0', participants: a, discounts: { m3: 33 }, mode: 'payer' }, a))), 9999999999);
});

// ===== C. 잔여 금액 처리 =====
test('C.잔여', 'remainderOf: 나누어떨어지면 0', () => eq(S.remainderOf(30000, ['a', 'b', 'c'], {}), 0));
test('C.잔여', 'remainderOf: 10원/3명 = 1원', () => eq(S.remainderOf(10, ['a', 'b', 'c'], {}), 1));
test('C.잔여', '결제자가 부담: 80,000원/3명 -> 결제자 26,668, 나머지 26,666', () => {
  const sh = S.expenseShares({ amount: 80000, payer: 'b', participants: ['a', 'b', 'c'], mode: 'payer' }, ['a', 'b', 'c']);
  eq(sh, { a: 26666, b: 26668, c: 26666 });
});
test('C.잔여', '랜덤 배분: 잔여만큼 서로 다른 사람이 1원씩, 차이 1원 이내', () => {
  const a = ids(mk(7));
  const sh = S.expenseShares({ amount: 100003, payer: 'm0', participants: a, mode: 'random', seed: 99 }, a);
  const v = Object.values(sh);
  eq(sum(v), 100003); assert(Math.max(...v) - Math.min(...v) <= 1, '차이 1원 초과');
});
test('C.잔여', '랜덤 배분: 같은 seed면 같은 결과, 다른 seed면 달라질 수 있음', () => {
  const a = ids(mk(10)), e = (seed) => S.expenseShares({ amount: 100003, payer: 'm0', participants: a, mode: 'random', seed }, a);
  eq(e(5), e(5));
  assert([1, 2, 3, 4, 5, 6].some((s) => JSON.stringify(e(s)) !== JSON.stringify(e(5))), 'seed가 결과에 영향을 주지 않음');
});
test('C.잔여', '금액 < 인원 (1원/5명): 합계 1원 유지', () => {
  const a = ids(mk(5));
  eq(sum(Object.values(S.expenseShares({ amount: 1, payer: 'm2', participants: a, mode: 'random', seed: 3 }, a))), 1);
  eq(sum(Object.values(S.expenseShares({ amount: 1, payer: 'm2', participants: a, mode: 'payer' }, a))), 1);
});

// ===== D. 예외/경계 =====
test('D.비활성', '비활성화는 기존 지출에 영향 없음: 비활성 참여자도 기존 지출의 부담 유지', () => {
  const ms = mk(5); ms[3].active = false;
  const r = S.computeAll(ms, [{ id: 'e', amount: 50000, payer: 'm0', participants: ids(ms), mode: 'payer' }]);
  eq(r.total, 50000);
  eq(r.balances.find((b) => b.id === 'm3').owed, 10000, '비활성 m3의 부담액');
  eq(sum(r.balances.map((b) => b.owed)), 50000);
});
test('D.비활성', '비활성 참여자만 선택된 지출도 그대로 계산(자동 제외·재분배 금지)', () => {
  const ms = mk(3); ms[1].active = ms[2].active = false;
  const r = S.computeAll(ms, [{ id: 'e', amount: 9000, payer: 'm0', participants: ['m1', 'm2'], mode: 'payer' }]);
  eq(r.total, 9000); eq(r.balances.find((b) => b.id === 'm1').owed, 4500);
});
test('D.비활성', '지출 수정에서 함께한 사람을 해제하면 그때 재분배(참여자 목록이 바뀐 지출)', () => {
  const ms = mk(5); ms[3].active = false;
  const r = S.computeAll(ms, [{ id: 'e', amount: 40000, payer: 'm0', participants: ['m0', 'm1', 'm2', 'm4'], mode: 'payer' }]);
  eq(r.balances.find((b) => b.id === 'm3'), undefined, '해제된 비활성 참여자는 결과에서 빠져야 함');
  eq(sum(r.balances.map((b) => b.owed)), 40000);
});
test('D.예외', '결제자가 비활성이어도 결제 금액은 반영', () => {
  const ms = mk(3); ms[0].active = false;
  const r = S.computeAll(ms, [{ id: 'e', amount: 9000, payer: 'm0', participants: ['m1', 'm2'], mode: 'payer' }]);
  eq(r.balances.find((b) => b.id === 'm0').paid, 9000);
  eq(sum(r.balances.map((b) => b.net)), 0);
});
test(EXC, '금액 0, 음수, 소수, 문자열 입력은 안전하게 처리(오염 없이 거부/보정)', () => {
  const ms = mk(3), a = ids(ms);
  for (const amt of [0, -500, 1000.9, '5000', 'abc', NaN, null, undefined]) {
    const r = S.computeAll(ms, [{ id: 'e', amount: amt, payer: 'm0', participants: a, mode: 'payer' }]);
    assert(r.balances.every((b) => Number.isInteger(b.owed) && Number.isInteger(b.paid)), `정수 아님 (${amt})`);
    eq(sum(r.balances.map((b) => b.net)), 0, `차액합 (${amt})`);
  }
});
test(EXC, '감면율 범위 밖(-5, 150, "x")은 0~100으로 보정', () => {
  eq(S.toPct(-5), 0); eq(S.toPct(150), 100); eq(S.toPct('x'), 0);
});
test('D.예외', '지출 0건: 차액 0, 송금 없음', () => {
  const r = S.computeAll(mk(4), []);
  eq(r.transfers, []); assert(r.balances.every((b) => b.net === 0), '잔액');
});
test('D.예외', '참여자 1명: 송금 없음', () => {
  const r = S.computeAll(mk(1), [{ id: 'e', amount: 5000, payer: 'm0', participants: ['m0'], mode: 'payer' }]);
  eq(r.transfers, []);
});
test('D.예외', '금액 수정/항목 삭제 후 재계산 반영', () => {
  const ms = mk(4), a = ids(ms), mkE = (amt) => ({ id: 'e', amount: amt, payer: 'm0', participants: a, mode: 'payer' });
  eq(S.computeAll(ms, [mkE(40000)]).total, 40000);
  eq(S.computeAll(ms, [mkE(52000)]).total, 52000);
  eq(S.computeAll(ms, []).total, 0);
});
test('D.PRD예시', '예시2: 택시 4:4 + 밥값 결제자 불일치 -> 송금 최대 7회, 상계 일치', () => {
  const ms = mk(8), a = ids(ms);
  const ex = [
    { id: 't1', amount: 14000, payer: 'm0', participants: a.slice(0, 4), mode: 'payer' },
    { id: 't2', amount: 12000, payer: 'm4', participants: a.slice(4), mode: 'payer' },
    { id: 'f', amount: 160000, payer: 'm7', participants: a, mode: 'payer' },
  ];
  const r = S.computeAll(ms, ex);
  assert(r.transfers.length <= 7, '송금 횟수 초과');
  eq(r.total, 186000);
});
test('D.PRD예시', '예시3: 술 안 마신 사람 제외(일부 참여) 반영', () => {
  const ms = mk(4), a = ids(ms);
  const r = S.computeAll(ms, [{ id: 'e', amount: 90000, payer: 'm0', participants: a.slice(1), mode: 'payer' }]);
  eq(r.balances.find((b) => b.id === 'm0').owed, 0);
});
test('D.PRD예시', '예시5: 번갈아 결제(같은 금액) -> 송금 0회', () => {
  const ms = mk(4), a = ids(ms);
  eq(S.computeAll(ms, a.map((p, i) => ({ id: 'e' + i, amount: 40000, payer: p, participants: a, mode: 'payer' }))).transfers, []);
});

// ===== F. 감면 대상 수 규칙: 0명 이상 N-1명 이하 =====
const disc = (arr, pct = 20) => Object.fromEntries(arr.map((i) => [i, pct]));
for (const n of [5, 10, 20]) {
  const ms = mk(n), a = ids(ms);
  test(EXC, `${n}명 중 ${n}명(전원) 감면은 거부(계산에서 제외 + 사유 기록)`, () => {
    const r = S.computeAll(ms, [{ id: 'e', amount: 100000, payer: 'm0', participants: a, discounts: disc(a), mode: 'payer' }]);
    assert(Array.isArray(r.invalid) && r.invalid.length === 1 && r.invalid[0].id === 'e', 'invalid에 기록되지 않음');
    eq(r.total, 0, '거부된 지출이 총액에 반영됨');
  });
  test(EXC, `${n}명 중 ${n}명(전원) 감면: 거부 사유에 감면 안내가 기록되고 다른 지출 계산에는 영향 없음`, () => {
    const ok = { id: 'ok', amount: n * 1000, payer: 'm0', participants: a, discounts: {}, mode: 'payer' };
    const bad = { id: 'bad', amount: 50000, payer: 'm0', participants: a, discounts: disc(a), mode: 'payer' };
    const r = S.computeAll(ms, [bad, ok]);
    assert(r.invalid.length === 1 && /감면/.test(r.invalid[0].reason), '사유 기록 없음');
    eq(r.total, n * 1000, '정상 지출 합계'); eq(sum(r.balances.map((b) => b.owed)), n * 1000);
  });
  test('F.감면규칙', `${n}명 중 ${n - 1}명 감면은 허용(나머지 1명이 재분배 부담), 합계 일치`, () => {
    const e = { id: 'e', amount: 100003, payer: 'm0', participants: a, discounts: disc(a.slice(1), 50), mode: 'payer' };
    const r = S.computeAll(ms, [e]);
    assert(!r.invalid || r.invalid.length === 0, '허용되어야 하는데 거부됨');
    eq(r.total, 100003); eq(sum(r.balances.map((b) => b.owed)), 100003);
    const o = oracle(100003, a, 'm0', disc(a.slice(1), 50), 'payer');
    eq(Object.fromEntries(r.balances.map((b) => [b.id, b.owed])), o.sh, '개인별');
  });
  test('F.감면규칙', `${n}명 중 0명 감면은 허용`, () => {
    const r = S.computeAll(ms, [{ id: 'e', amount: 100000, payer: 'm0', participants: a, discounts: {}, mode: 'payer' }]);
    eq(r.total, 100000);
  });
}
test('F.감면규칙', '감면율 0%만 지정한 인원은 감면 대상으로 세지 않음(전원 0%여도 허용)', () => {
  const a = ids(mk(3)), r = S.computeAll(mk(3), [{ id: 'e', amount: 9000, payer: 'm0', participants: a, discounts: disc(a, 0), mode: 'payer' }]);
  eq(r.total, 9000);
});
test('F.감면규칙', '여러 명 감면(m1 20%, m2 50%): 비감면자 균등 재분배, 합계 일치', () => {
  const a = ids(mk(5)), e = { id: 'e', amount: 99999, payer: 'm0', participants: a, discounts: { m1: 20, m2: 50 }, mode: 'payer' };
  const sh = S.expenseShares(e, a), o = oracle(99999, a, 'm0', { m1: 20, m2: 50 }, 'payer');
  eq(sh, o.sh);
});
test('F.검증모듈', 'validate.js가 존재하고 validateExpense를 제공', () => assert(V && typeof V.validateExpense === 'function', 'src/validate.js(Validate.validateExpense) 없음'));
test(EXC, '검증모듈: 전원 감면 입력은 ok=false + 감면 안내 문구', () => {
  assert(V, 'validate.js 없음');
  const a = ids(mk(4)), r = V.validateExpense({ amount: 1000, payer: 'm0', participants: a, discounts: disc(a) }, a);
  eq(r.ok, false); assert(/감면/.test(r.error), '안내 문구에 감면 없음: ' + r.error);
});
test('F.검증모듈', 'N-1명 감면 / 감면 없음은 ok=true', () => {
  assert(V, 'validate.js 없음');
  const a = ids(mk(4));
  eq(V.validateExpense({ amount: 1000, payer: 'm0', participants: a, discounts: disc(a.slice(1)) }, a).ok, true);
  eq(V.validateExpense({ amount: 1000, payer: 'm0', participants: a, discounts: {} }, a).ok, true);
});
test(EXC, '검증모듈: 금액 0/참여자 없음/없는 결제자는 ok=false', () => {
  assert(V, 'validate.js 없음');
  const a = ids(mk(3));
  eq(V.validateExpense({ amount: 0, payer: 'm0', participants: a }, a).ok, false);
  eq(V.validateExpense({ amount: 1000, payer: 'm0', participants: [] }, a).ok, false);
  eq(V.validateExpense({ amount: 1000, payer: 'ghost', participants: a }, a).ok, false);
});

// ===== G. 명세서 반영 여부 (명세에 정의되지 않은 동작은 가정으로 PASS 처리하지 않는다) =====
const ROOT = path.resolve(SRC, '..');
const readDoc = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return ''; } };
const spec = readDoc('docs/PRD.md') + '\n' + readDoc('docs/requirements.md');
const skill = readDoc('.claude/skills/test.md');
const RULE_DISC = /감면\s*대상은\s*0\s*명\s*이상\s*N\s*-\s*1\s*명\s*이하/;
const RULE_INACTIVE = /비활성화된\s*참여자[\s\S]{0,80}지출\s*내역[\s\S]{0,80}수정[\s\S]{0,80}함께한\s*사람[\s\S]{0,40}비활성화/;
test('G.명세반영', '명세서에 감면 대상 수 규칙(0명 이상 N-1명 이하)이 정의됨 [전원 감면]', () => assert(RULE_DISC.test(spec), 'PRD/requirements에 규칙 없음 -> 가정 처리'));
test('G.명세반영', '명세서에 비활성 참여자 처리 규칙(수정에서 함께한 사람 비활성화)이 정의됨 [비활성 참여자]', () => assert(RULE_INACTIVE.test(spec), 'PRD/requirements에 규칙 없음 -> 가정 처리'));
test('G.명세반영', '명세서에 다중 감면 재분배 규칙(감면 대상이 아닌 사람에게 균등 재분배)이 정의됨 [다중 감면]', () => assert(/감면\s*대상이\s*아닌[\s\S]{0,40}균등/.test(spec) || /나머지\s*N\s*-\s*1\s*명/.test(spec) && RULE_DISC.test(spec), '다중 감면 재분배 규칙이 명세서에서 확인되지 않음 -> 가정 처리'));
test('G.명세반영', 'test.md 검증 기준에 감면 대상 수/비활성 규칙이 반영됨', () => assert(RULE_DISC.test(skill) && RULE_INACTIVE.test(skill), '.claude/skills/test.md에 규칙 없음'));

// ===== E. 무작위 300건 (재현 가능 seed) =====
{
  const rand = S.rng(20261011);
  let bad = '';
  for (let k = 0; k < 300 && !bad; k++) {
    const n = 5 + Math.floor(rand() * 16), ms = mk(n), a = ids(ms);
    const ex = Array.from({ length: 1 + Math.floor(rand() * 5) }, (_, i) => {
      const parts = a.filter(() => rand() < 0.7); if (!parts.length) parts.push(a[0]);
      const discounts = {}; parts.slice(1).forEach((p) => { if (rand() < 0.2) discounts[p] = [10, 20, 50, 100][Math.floor(rand() * 4)]; }); // 첫 사람은 항상 비감면(감면 대상은 N-1명 이하)
      return { id: 'e' + i, amount: 1 + Math.floor(rand() * 500000), payer: a[Math.floor(rand() * n)], participants: parts, discounts, mode: rand() < 0.5 ? 'payer' : 'random', seed: 1 + Math.floor(rand() * 1e6) };
    });
    const r = S.computeAll(ms, ex), total = sum(ex.map((e) => e.amount));
    const left = Object.fromEntries(r.balances.map((b) => [b.id, b.net]));
    r.transfers.forEach((t) => { left[t.from] += t.amount; left[t.to] -= t.amount; });
    if (r.total !== total) bad = `${k}: total`;
    else if (sum(r.balances.map((b) => b.owed)) !== total) bad = `${k}: 부담 합계`;
    else if (sum(r.balances.map((b) => b.net)) !== 0) bad = `${k}: 차액합`;
    else if (r.transfers.length > n - 1) bad = `${k}: 송금 ${r.transfers.length} > ${n - 1}`;
    else if (Object.values(left).some((v) => v !== 0)) bad = `${k}: 상계`;
    else if (JSON.stringify(S.computeAll(ms, ex)) !== JSON.stringify(r)) bad = `${k}: 재현성`;
  }
  test('E.무작위300', '5~20명 무작위(감면·랜덤 포함): 합계/차액/송금횟수/상계/재현성', () => assert(!bad, bad));
}

// ---- 결과 출력 ----
let pass = 0, fail = 0;
for (const g of [...new Set(results.map((r) => r.group))]) {
  const rs = results.filter((r) => r.group === g);
  console.log(`■ ${g} (${rs.filter((r) => r.ok).length}/${rs.length} PASS)`);
  rs.forEach((r) => { if (r.ok) pass++; else { fail++; console.log(`  FAIL ${r.name}\n       └ ${r.msg}`); } });
}
console.log(`\n==== 로직 테스트: 총 ${results.length}건 / PASS ${pass} / FAIL ${fail} ====`);
process.exit(fail ? 1 : 0);
