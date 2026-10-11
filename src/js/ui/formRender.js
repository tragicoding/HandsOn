// 2. 지출 입력 폼 그리기: 결제자 선택, 함께 쓴 사람, 감면 인원과 % 입력칸
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 지출 입력 폼의 선택 영역을 현재 상태에 맞게 다시 그린다.
   * 핵심 로직: formMembers() 목록으로 결제자 <select>와 칩 버튼을 만들고, 선택된 사람 중에서만
   *            감면 칩을 보여주며, 감면으로 선택된 사람마다 % 입력칸을 만든다.
   */
  function renderForm() {
    const { $, esc, form } = ns;
    const act = ns.formMembers();

    const payerSel = $('expPayer');
    const prev = payerSel.value;
    payerSel.innerHTML = act.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
    if (act.some((m) => m.id === prev)) payerSel.value = prev;

    $('expParticipants').innerHTML = act.length
      ? act.map((m) => `<button type="button" class="toggle${m.active ? '' : ' inactive'}${form.participants.has(m.id) ? ' on' : ''}" data-id="${m.id}">${esc(m.name)}</button>`).join('')
      : '<span class="muted">참여자를 먼저 추가하세요</span>';

    const sel = act.filter((m) => form.participants.has(m.id));
    $('expDiscounts').innerHTML = sel.length
      ? sel.map((m) => `<button type="button" class="toggle disc${m.id in form.discounts ? ' on' : ''}" data-id="${m.id}">${esc(m.name)}</button>`).join('')
      : '<span class="muted">함께 쓴 사람을 선택하세요</span>';

    $('discountInputs').innerHTML = Object.keys(form.discounts).filter((id) => ns.member(id)).map((id) =>
      `<div class="disc-row"><label for="disc-${id}">${esc(ns.nameOf(id))} 감면율</label><input id="disc-${id}" data-id="${id}" type="text" inputmode="numeric" value="${form.discounts[id]}" /><span>%</span></div>`
    ).join('');

    $('expSubmit').textContent = form.editingId ? '수정 저장' : '지출 추가';
    $('cancelEdit').hidden = !form.editingId;
  }

  ns.renderForm = renderForm;
})(globalThis.DutchPay = globalThis.DutchPay || {});
