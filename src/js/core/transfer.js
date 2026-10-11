// 송금 목록 계산 (누가 누구에게 얼마를 보내면 되는지)
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 사람별 차액(+받을 돈, -보낼 돈)으로 최소 횟수에 가까운 송금 목록을 만든다.
   * 핵심 로직: 가장 많이 받을 사람과 가장 많이 보낼 사람을 짝지어 둘 중 작은 금액만큼 상계하는 일을
   *            한쪽이 0원이 될 때까지 반복한다. 송금 횟수는 최대 "인원 - 1"번이다.
   */
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

  ns.computeTransfers = computeTransfers;
})(globalThis.DutchPay = globalThis.DutchPay || {});
