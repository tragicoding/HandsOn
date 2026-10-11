// 2. 지출 입력 폼의 클릭·입력 동작 (저장 동작은 formSubmit.js)
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 금액 칸에 숫자만 넣고 천 단위 콤마를 보여준다.
   * 핵심 로직: 숫자가 아닌 글자와 앞의 0을 지우고, 최대 12자리까지만 받는다.
   */
  function bindAmount() {
    const el = ns.$('expAmount');
    el.addEventListener('input', () => {
      const digits = el.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
      el.value = digits ? Number(digits).toLocaleString('ko-KR') : '';
    });
  }

  /**
   * 기능 및 역할: "전체 선택/해제"와 참여자 칩 선택을 처리한다.
   * 핵심 로직: 선택이 바뀔 때마다 선택에서 빠진 사람의 감면을 지우고, 감면 규칙(전원 감면 금지)을 다시 확인한다.
   */
  function bindParticipants() {
    const { $, form } = ns;
    const afterChange = () => {
      Object.keys(form.discounts).forEach((id) => { if (!form.participants.has(id)) delete form.discounts[id]; });
      ns.enforceDiscountRule();
      ns.renderForm();
    };
    $('toggleAll').addEventListener('click', () => {
      const ids = ns.formMembers().map((m) => m.id);
      const allOn = ids.length > 0 && ids.every((id) => form.participants.has(id));
      form.participants = new Set(allOn ? [] : ids);
      afterChange();
    });
    $('expParticipants').addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      const id = b.dataset.id;
      if (form.participants.has(id)) form.participants.delete(id); else form.participants.add(id);
      afterChange();
    });
  }

  /**
   * 기능 및 역할: 감면 인원 선택과 % 입력을 처리한다.
   * 핵심 로직: 새로 감면을 켤 때 감면 대상 수 규칙(0명 이상 N-1명 이하)을 넘으면 거부하고 안내한다.
   *            % 입력은 정수만 받는다. 소수점(. ,)이 들어오면 소수 부분을 버리고 안내한다. 0~100으로 제한한다.
   */
  function bindDiscounts() {
    const { $, form } = ns;
    $('expDiscounts').addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      const id = b.dataset.id;
      if (id in form.discounts) delete form.discounts[id];
      else {
        const check = ns.checkDiscountCount([...form.participants], Object.assign({}, form.discounts, { [id]: 10 }));
        if (!check.ok) return ns.toast(check.error);
        form.discounts[id] = 10;
      }
      ns.renderForm();
    });
    $('discountInputs').addEventListener('input', (e) => {
      const el = e.target.closest('input[data-id]');
      if (!el) return;
      if (/[.,]/.test(el.value)) ns.toast('감면율은 정수만 입력할 수 있어요');
      el.value = el.value.split(/[.,]/)[0].replace(/[^\d]/g, '').slice(0, 3);
      form.discounts[el.dataset.id] = Math.min(100, Number(el.value) || 0);
    });
  }

  /** 기능 및 역할: 수정 중 "취소" 버튼으로 폼을 처음 상태로 되돌린다. */
  function bindCancel() {
    ns.$('cancelEdit').addEventListener('click', () => { ns.resetForm(); ns.renderForm(); ns.renderExpenses(); });
  }

  ns.bindFormEvents = function () { bindAmount(); bindParticipants(); bindDiscounts(); bindCancel(); };
})(globalThis.DutchPay = globalThis.DutchPay || {});
