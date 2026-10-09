// 정산 계산 로직 (DOM 의존 없음 — Node에서도 테스트 가능)
(function (root) {
  /**
   * 금액을 participants 수만큼 원 단위로 나눔. 나머지 원은 앞사람부터 1원씩.
   * @returns {Object<string, number>} memberId -> 부담액
   */
  function splitAmount(amount, participantIds) {
    const n = participantIds.length;
    const shares = {};
    if (!n) return shares;
    const base = Math.floor(amount / n);
    let rest = amount - base * n;
    for (const id of participantIds) {
      shares[id] = base + (rest > 0 ? 1 : 0);
      if (rest > 0) rest--;
    }
    return shares;
  }

  /** 멤버별 낸 돈 / 부담액 / 잔액(+받을 돈, -보낼 돈) */
  function computeBalances(members, expenses) {
    const map = {};
    for (const m of members) map[m.id] = { id: m.id, name: m.name, paid: 0, owed: 0, net: 0 };
    for (const e of expenses) {
      const ids = e.participants.filter((id) => map[id]);
      if (!map[e.payer] || !ids.length) continue;
      map[e.payer].paid += e.amount;
      const shares = splitAmount(e.amount, ids);
      for (const id of ids) map[id].owed += shares[id];
    }
    for (const id in map) map[id].net = map[id].paid - map[id].owed;
    return members.map((m) => map[m.id]);
  }

  /** 최소 송금 횟수에 가깝게: 가장 많이 받을 사람 ↔ 가장 많이 보낼 사람을 반복 매칭 */
  function computeTransfers(balances) {
    const creditors = balances.filter((b) => b.net > 0).map((b) => ({ ...b, left: b.net }));
    const debtors = balances.filter((b) => b.net < 0).map((b) => ({ ...b, left: -b.net }));
    const out = [];
    while (creditors.length && debtors.length) {
      creditors.sort((a, b) => b.left - a.left);
      debtors.sort((a, b) => b.left - a.left);
      const c = creditors[0];
      const d = debtors[0];
      const amt = Math.min(c.left, d.left);
      out.push({ from: d.id, fromName: d.name, to: c.id, toName: c.name, amount: amt });
      c.left -= amt;
      d.left -= amt;
      if (!c.left) creditors.shift();
      if (!d.left) debtors.shift();
    }
    return out;
  }

  const api = { splitAmount, computeBalances, computeTransfers };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Settle = api;
})(this);
