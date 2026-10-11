// 2. 지출 내역 목록: 쌓인 지출을 보여주고, 수정·삭제를 처리한다.
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 지출 한 건을 목록의 한 줄(HTML)로 만든다.
   * 핵심 로직: 계산에서 제외된 지출이면 사유를 붙이고, 감면·잔여 처리 방식도 함께 적는다.
   */
  function expenseItem(x, r) {
    const { esc, won, nameOf, member, form, state } = ns;
    const ids = x.participants.filter((id) => member(id));
    const skipped = !r.included.includes(x.id);
    const who = ids.length === state.members.length ? '전원' : ids.map(nameOf).map(esc).join(', ');
    const per = ids.length ? Math.floor(x.amount / ids.length) : 0;
    const discs = Object.keys(x.discounts || {}).filter((id) => ids.includes(id)).map((id) => `${esc(nameOf(id))} ${x.discounts[id]}% 감면`);
    const rest = ids.length && ns.remainderOf(x.amount, ids, x.discounts) > 0;
    const mode = rest ? (x.mode === 'random' ? ' · 잔여 랜덤' : ' · 잔여 결제자 부담') : '';
    const why = (r.invalid.find((v) => v.id === x.id) || {}).reason || '';
    return `<li class="expense${x.id === form.editingId ? ' editing' : ''}">
      <div class="exp-main"><strong>${esc(x.title)}</strong><span class="amount">${won(x.amount)}</span></div>
      <div class="exp-sub">${esc(nameOf(x.payer))} 결제 · ${who} (${ids.length}명, 1인 약 ${won(per)})${discs.length ? ' · ' + discs.join(', ') : ''}${mode}</div>
      ${skipped ? `<div class="excluded">계산에서 제외됨: ${esc(why)}</div>` : ''}
      <div class="exp-actions">
        <button type="button" class="link" data-edit="${x.id}">수정</button>
        <button type="button" class="link danger" data-del="${x.id}">삭제</button>
      </div>
    </li>`;
  }

  /** 기능 및 역할: 지출 목록과 "총 지출" 한 줄을 그린다. */
  function renderExpenses() {
    const { state, $, won } = ns;
    const r = ns.computeAll(state.members, state.expenses);
    $('expenseList').innerHTML = state.expenses.length
      ? state.expenses.map((x) => expenseItem(x, r)).join('')
      : '<li class="empty">지출을 추가하면 여기에 쌓여요.</li>';
    const n = Math.max(1, r.balances.length);
    $('totalLine').innerHTML = r.included.length ? `총 지출 <strong>${won(r.total)}</strong> · 1인 평균 ${won(Math.round(r.total / n))}` : '';
  }

  /**
   * 기능 및 역할: 지출을 폼으로 불러와 수정 상태로 바꾼다.
   * 핵심 로직: 비활성 참여자도 포함해 불러온다. 여기서 직접 해제해야 그 지출에서 빠진다.
   */
  function startEdit(x) {
    const { form, member, $ } = ns;
    form.editingId = x.id;
    form.editingMembers = new Set(x.participants.filter((id) => member(id)));
    form.participants = new Set(form.editingMembers);
    form.discounts = Object.assign({}, x.discounts || {});
    Object.keys(form.discounts).forEach((id) => { if (!form.participants.has(id)) delete form.discounts[id]; });
    ns.render();
    $('expTitle').value = x.title;
    $('expAmount').value = Number(x.amount).toLocaleString('ko-KR');
    if (member(x.payer)) $('expPayer').value = x.payer;
    $('expenseForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** 기능 및 역할: 목록의 "수정"/"삭제" 버튼 클릭을 처리한다. (삭제 중인 지출을 수정 중이면 폼도 비운다) */
  function bindExpenseList() {
    ns.$('expenseList').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      const edit = e.target.closest('[data-edit]');
      const { state, form } = ns;
      if (del) {
        state.expenses = state.expenses.filter((x) => x.id !== del.dataset.del);
        if (form.editingId === del.dataset.del) ns.resetForm();
        ns.commit();
      } else if (edit) {
        const x = state.expenses.find((v) => v.id === edit.dataset.edit);
        if (x) startEdit(x);
      }
    });
  }

  ns.renderExpenses = renderExpenses;
  ns.bindExpenseList = bindExpenseList;
})(globalThis.DutchPay = globalThis.DutchPay || {});
