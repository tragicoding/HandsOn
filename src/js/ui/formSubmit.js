// 2. 지출 저장(추가·수정): 검증 -> 잔여 처리 팝업 -> 저장
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 폼 입력으로 지출 한 건을 만든다. 문제가 있으면 안내 후 null을 돌려준다.
   * 핵심 로직: 항목 -> validate.js 검증(금액·결제자·함께한 사람·감면 대상 수) 순서로 확인한다.
   */
  function readExpense() {
    const { $, form } = ns;
    const title = $('expTitle').value.trim();
    const amount = Number($('expAmount').value.replace(/[^\d]/g, '')) || 0;
    const payer = $('expPayer').value;
    const participants = [...form.participants].filter((id) => ns.member(id));
    if (!title) { ns.toast('항목을 입력하세요'); return null; }
    const discounts = {};
    participants.forEach((id) => { if (form.discounts[id] > 0) discounts[id] = ns.toPct(form.discounts[id]); });
    const exp = { id: form.editingId || ns.uid(), title, amount, payer, participants, discounts, mode: 'payer', seed: 1 };
    const check = ns.validateExpense(exp, ns.state.members.map((m) => m.id));
    if (!check.ok) { ns.toast(check.error); return null; }
    return exp;
  }

  /**
   * 기능 및 역할: 나누어떨어지지 않을 때 잔여 처리 방식을 팝업으로 묻는다. (수정할 때도 다시 묻는다)
   * 핵심 로직: "결제자가 내기"면 mode=payer, "랜덤"이면 새 seed를 뽑아 저장(다시 계산해도 같은 결과).
   *            취소하면 false를 돌려준다.
   */
  async function askRemainder(exp) {
    const rest = ns.remainderOf(exp.amount, exp.participants, exp.discounts);
    if (rest <= 0) return true;
    const choice = await ns.ask('나누어떨어지지 않아요', `${ns.won(rest)}이 남아요. 남는 금액을 어떻게 처리할까요?`, [
      { label: `결제자가 내기 (${ns.nameOf(exp.payer)})`, value: 'payer', cls: 'primary' },
      { label: '랜덤', value: 'random' },
      { label: '취소', value: null, cls: 'ghost' },
    ]);
    if (!choice) return false;
    exp.mode = choice;
    if (choice === 'random') exp.seed = 1 + Math.floor(Math.random() * 2147483646);
    return true;
  }

  /** 기능 및 역할: 지출 폼 제출을 처리한다. (참여자가 없으면 안내) */
  function bindFormSubmit() {
    ns.$('expenseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!ns.activeIds().length) return ns.toast('먼저 참여자를 추가하세요');
      const exp = readExpense();
      if (!exp || !(await askRemainder(exp))) return;
      const { state, form } = ns;
      if (form.editingId) {
        state.expenses = state.expenses.map((x) => (x.id === form.editingId ? exp : x));
        ns.toast('수정했어요');
      } else state.expenses.push(exp);
      ns.resetForm();
      ns.commit();
    });
  }

  ns.bindFormSubmit = bindFormSubmit;
})(globalThis.DutchPay = globalThis.DutchPay || {});
