// 정산 계산 로직 (화면과 분리되어 Node에서도 테스트 가능)
// 모든 금액은 원 단위 정수. requirements.md 비기능 요구 6번 알고리즘을 따른다.
(function (root) {
  'use strict';

  // 재현 가능한 난수 (같은 seed -> 같은 순서). "랜덤 배분" 결과를 저장해 재계산해도 같게 하기 위함.
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, seed) {
    const a = arr.slice();
    const rand = rng(seed);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // 입력 정리: 금액은 0 이상의 정수, 감면율은 0~100 정수
  function toWon(v) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  function toPct(v) {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  }

  /**
   * 소수점 버림 후의 개인별 기본 부담액(잔여 분배 전)을 구한다.
   * BigInt로 정확히 계산 (큰 금액에서도 부동소수점 오차 없음).
   * - 기본: total / N
   * - 감면 대상: 기본액 x (1 - K%)
   * - 감면으로 줄어든 금액은 감면 대상이 아닌 나머지 사람에게 균등 재분배
   */
  function baseShares(total, ids, discounts) {
    const n = ids.length;
    const out = {};
    if (!n) return out;
    const T = BigInt(toWon(total));
    const N = BigInt(n);
    const disc = {};
    let sumPct = 0n;
    let discCount = 0;
    for (const id of ids) {
      const p = toPct(discounts && discounts[id]);
      if (p > 0) { disc[id] = BigInt(p); sumPct += BigInt(p); discCount++; }
    }
    const R = BigInt(n - discCount); // 감면 대상이 아닌 사람 수
    if (discCount === 0 || R === 0n) {
      // 감면 없음 (또는 전원이 감면 대상이라 재분배할 사람이 없으면 균등 분배)
      for (const id of ids) out[id] = Number(T / N);
      return out;
    }
    const den = 100n * N * R;
    for (const id of ids) {
      if (disc[id] !== undefined) out[id] = Number((T * (100n - disc[id]) * R) / den);
      else out[id] = Number((T * (100n * R + sumPct)) / den);
    }
    return out;
  }

  /** 나누어떨어지지 않아 남는 금액(원). 0이면 잔여 없음. */
  function remainderOf(total, ids, discounts) {
    if (!ids.length) return 0;
    const base = baseShares(total, ids, discounts);
    return toWon(total) - ids.reduce((s, id) => s + base[id], 0);
  }

  /**
   * 한 지출의 개인별 부담액.
   * mode: 'payer'(결제자가 부담) | 'random'(랜덤 배분, seed로 재현 가능)
   */
  function expenseShares(exp, ids) {
    const total = toWon(exp.amount);
    const shares = baseShares(total, ids, exp.discounts);
    let remainder = total - ids.reduce((s, id) => s + shares[id], 0);
    if (remainder > 0) {
      if (exp.mode === 'random') {
        const order = shuffle(ids, exp.seed || 1);
        for (let i = 0; i < remainder; i++) shares[order[i % order.length]] += 1;
      } else {
        // 결제자가 부담 (기본값)
        const who = exp.payer;
        shares[who] = (shares[who] || 0) + remainder;
      }
    }
    return shares;
  }

  // 입력 검증 모듈 (브라우저: 전역 Validate, Node: require)
  const Validate = (typeof module !== 'undefined' && module.exports) ? require('./validate.js') : root.Validate;

  /**
   * 전체 정산.
   * members: [{id, name, active}], expenses: [{id,title,amount,payer,participants,discounts,mode,seed}]
   * 비활성화는 기존 지출을 바꾸지 않는다(비활성 참여자도 기존 지출의 부담을 그대로 가진다).
   * 지출에서 빼려면 지출 내역의 "수정"에서 함께한 사람을 해제한다.
   * 검증에 실패한 지출(감면 대상 전원, 금액 없음 등)은 계산에서 제외하고 invalid에 사유를 남긴다.
   */
  function computeAll(members, expenses) {
    const byId = {};
    for (const m of members) byId[m.id] = { id: m.id, name: m.name, active: m.active !== false, paid: 0, owed: 0, net: 0 };
    let total = 0;
    const included = [];
    const excluded = [];
    const invalid = [];
    for (const e of expenses) {
      const ids = (e.participants || []).filter((id) => byId[id]);
      const amount = toWon(e.amount);
      const check = Validate.validateExpense(e, Object.keys(byId));
      if (!check.ok) { excluded.push(e.id); invalid.push({ id: e.id, reason: check.error }); continue; }
      const shares = expenseShares(Object.assign({}, e, { amount }), ids);
      byId[e.payer].paid += amount;
      for (const id in shares) byId[id].owed += shares[id];
      total += amount;
      included.push(e.id);
    }
    const balances = [];
    for (const m of members) {
      const b = byId[m.id];
      b.net = b.paid - b.owed;
      if (b.active || b.paid || b.owed) balances.push(b);
    }
    return { total, balances, transfers: computeTransfers(balances), included, excluded, invalid };
  }

  /** 송금 목록: 가장 많이 받을 사람 <-> 가장 많이 보낼 사람을 반복 상계 (최대 인원-1회) */
  function computeTransfers(balances) {
    const cr = balances.filter((b) => b.net > 0).map((b) => ({ id: b.id, name: b.name, left: b.net }));
    const db = balances.filter((b) => b.net < 0).map((b) => ({ id: b.id, name: b.name, left: -b.net }));
    const out = [];
    while (cr.length && db.length) {
      cr.sort((a, b) => b.left - a.left);
      db.sort((a, b) => b.left - a.left);
      const c = cr[0], d = db[0];
      const amount = Math.min(c.left, d.left);
      out.push({ from: d.id, fromName: d.name, to: c.id, toName: c.name, amount });
      c.left -= amount; d.left -= amount;
      if (!c.left) cr.shift();
      if (!d.left) db.shift();
    }
    return out;
  }

  const api = { rng, shuffle, toWon, toPct, baseShares, remainderOf, expenseShares, computeAll, computeTransfers };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Settle = api;
})(typeof self !== 'undefined' ? self : this);
