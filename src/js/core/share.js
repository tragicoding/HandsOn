// 지출 한 건을 사람별 부담액으로 나누는 계산 (requirements 비기능 요구 6번 알고리즘)
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 소수점 버림 후의 개인별 기본 부담액(잔여 분배 전)을 구한다.
   * 핵심 로직: 기본은 총액/N. 감면 대상은 기본액 x (1 - K%)이고, 줄어든 금액은 감면 대상이 아닌
   *            사람에게 균등 재분배한다. 큰 금액에서도 오차가 없도록 BigInt(큰 정수)로 계산한다.
   */
  function baseShares(total, ids, discounts) {
    const out = {};
    if (!ids.length) return out;
    const T = BigInt(ns.toWon(total));
    const N = BigInt(ids.length);
    const pct = {};
    let sumPct = 0n;
    for (const id of ids) {
      const p = ns.toPct(discounts && discounts[id]);
      if (p > 0) { pct[id] = BigInt(p); sumPct += BigInt(p); }
    }
    const R = N - BigInt(Object.keys(pct).length); // 감면 대상이 아닌 사람 수
    if (R === 0n || sumPct === 0n) {
      for (const id of ids) out[id] = Number(T / N);
      return out;
    }
    const den = 100n * N * R;
    for (const id of ids) {
      out[id] = id in pct ? Number((T * (100n - pct[id]) * R) / den) : Number((T * (100n * R + sumPct)) / den);
    }
    return out;
  }

  /**
   * 기능 및 역할: 나누어떨어지지 않아 남는 금액(원)을 구한다. 0이면 잔여 없음.
   * 핵심 로직: 총액에서 기본 부담액의 합을 뺀다.
   */
  function remainderOf(total, ids, discounts) {
    if (!ids.length) return 0;
    const base = baseShares(total, ids, discounts);
    return ns.toWon(total) - ids.reduce((s, id) => s + base[id], 0);
  }

  /**
   * 기능 및 역할: 지출 한 건의 최종 개인별 부담액을 구한다.
   * 핵심 로직: 남는 금액을 mode에 따라 처리한다.
   *   - 'payer'(기본): 결제자가 전부 부담
   *   - 'random': seed로 섞은 순서대로 1원씩 나눠 부담 (seed가 같으면 결과도 같음)
   */
  function expenseShares(exp, ids) {
    const total = ns.toWon(exp.amount);
    const shares = baseShares(total, ids, exp.discounts);
    const rest = total - ids.reduce((s, id) => s + shares[id], 0);
    if (rest > 0 && exp.mode === 'random') {
      const order = ns.shuffle(ids, exp.seed || 1);
      for (let i = 0; i < rest; i++) shares[order[i % order.length]] += 1;
    } else if (rest > 0) {
      shares[exp.payer] = (shares[exp.payer] || 0) + rest;
    }
    return shares;
  }

  ns.baseShares = baseShares;
  ns.remainderOf = remainderOf;
  ns.expenseShares = expenseShares;
})(globalThis.DutchPay = globalThis.DutchPay || {});
