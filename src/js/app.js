// 앱 시작점: 화면 그리기(render)를 묶고, 모든 동작을 연결한다.
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 데이터(state)대로 화면 전체를 다시 그린다.
   * 핵심 로직: 모임 이름 -> 참여자 -> 입력 폼 -> 지출 목록 -> 정산 결과 순서로 그린다.
   */
  ns.render = function () {
    ns.$('groupName').value = ns.state.groupName || '';
    ns.renderMembers();
    ns.renderForm();
    ns.renderExpenses();
    ns.renderResult();
  };

  // 처음 열 때: 저장된 활성 참여자는 모두 폼에서 선택된 상태로 시작
  ns.form.participants = new Set(ns.activeIds());
  ns.bindMembers();
  ns.bindFormEvents();
  ns.bindFormSubmit();
  ns.bindExpenseList();
  ns.bindCopy();
  ns.bindHeader();
  ns.render();
})(globalThis.DutchPay);
