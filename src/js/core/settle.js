// 전체 정산 (모든 지출을 합쳐 사람별 낸 돈 / 쓴 돈 / 차액과 송금 목록을 만든다)
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 참여자와 지출 목록으로 전체 정산 결과를 만든다.
   * 핵심 로직: 지출마다 검증 -> 통과하면 결제자의 낸 돈과 사람별 부담액을 더한다.
   *   - 검증 실패(전원 감면, 금액 없음 등)는 계산에서 빼고 invalid에 사유를 남긴다.
   *   - 비활성화는 기존 지출을 바꾸지 않는다. 지출에서 빼려면 지출 "수정"에서 함께한 사람을 해제한다.
   * 반환: { total, balances, transfers, included, excluded, invalid }
   */
  function computeAll(members, expenses) {
    const byId = {};
    for (const m of members) byId[m.id] = { id: m.id, name: m.name, active: m.active !== false, paid: 0, owed: 0, net: 0 };
    const out = { total: 0, included: [], excluded: [], invalid: [] };
    for (const e of expenses) {
      const check = ns.validateExpense(e, Object.keys(byId));
      if (!check.ok) { out.excluded.push(e.id); out.invalid.push({ id: e.id, reason: check.error }); continue; }
      const ids = (e.participants || []).filter((id) => byId[id]);
      const amount = ns.toWon(e.amount);
      const shares = ns.expenseShares(Object.assign({}, e, { amount }), ids);
      byId[e.payer].paid += amount;
      for (const id in shares) byId[id].owed += shares[id];
      out.total += amount;
      out.included.push(e.id);
    }
    const balances = [];
    for (const m of members) {
      const b = byId[m.id];
      b.net = b.paid - b.owed;
      if (b.active || b.paid || b.owed) balances.push(b);
    }
    return Object.assign(out, { balances, transfers: ns.computeTransfers(balances) });
  }

  ns.computeAll = computeAll;
})(globalThis.DutchPay = globalThis.DutchPay || {});
