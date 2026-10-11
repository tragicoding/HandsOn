// 2. 지출 입력 폼의 임시 상태 (저장하지 않음): 선택한 참여자, 감면, 수정 중인 지출
(function (ns) {
  'use strict';

  const form = { participants: new Set(), discounts: {}, editingId: null, editingMembers: new Set() };

  /**
   * 기능 및 역할: 폼의 "함께 쓴 사람" 칸에 보여줄 참여자 목록을 돌려준다.
   * 핵심 로직: 새 지출은 활성 참여자만, 지출 "수정" 중에는 그 지출에 포함된 비활성 참여자도 함께 보여줘서
   *            여기서 직접 해제할 수 있게 한다. (비활성화는 기존 지출을 자동으로 바꾸지 않는다)
   */
  function formMembers() {
    return ns.state.members.filter((m) => m.active || (form.editingId && form.editingMembers.has(m.id)));
  }

  /**
   * 기능 및 역할: 감면 대상이 전원이 되면(규칙 위반) 감면을 모두 풀고 안내한다.
   * 핵심 로직: 함께한 사람이 바뀐 뒤 checkDiscountCount가 실패하면 감면 선택을 비운다.
   */
  function enforceDiscountRule() {
    if (!ns.checkDiscountCount([...form.participants], form.discounts).ok) {
      form.discounts = {};
      ns.toast('감면 대상이 전원이 되어 감면을 해제했어요');
    }
  }

  /**
   * 기능 및 역할: 폼을 처음 상태로 되돌린다. (새 지출은 활성 참여자 전원 선택)
   * 핵심 로직: 수정 상태·감면을 비우고 입력칸을 비운다.
   */
  function resetForm() {
    form.editingId = null;
    form.discounts = {};
    form.editingMembers = new Set();
    form.participants = new Set(ns.activeIds());
    ns.$('expTitle').value = '';
    ns.$('expAmount').value = '';
  }

  ns.form = form;
  ns.formMembers = formMembers;
  ns.enforceDiscountRule = enforceDiscountRule;
  ns.resetForm = resetForm;
})(globalThis.DutchPay = globalThis.DutchPay || {});
