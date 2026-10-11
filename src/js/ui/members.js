// 1. 참여자 영역: 추가(Enter/버튼), 비활성화(x), 목록 그리기
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 참여자 칩(이름 노드) 목록을 그린다.
   * 핵심 로직: 비활성 참여자는 off 모양(색만 변경)으로 그린다. x 버튼은 삭제가 아니라 활성/비활성 전환이다.
   */
  function renderMembers() {
    const { $, esc, state } = ns;
    $('memberList').innerHTML = state.members.length
      ? state.members.map((m) => `<li class="chip${m.active ? '' : ' off'}">${esc(m.name)}<button type="button" data-toggle="${m.id}" aria-label="${esc(m.name)} ${m.active ? '비활성화' : '활성화'}">×</button></li>`).join('')
      : '<li class="empty">아직 참여자가 없어요.</li>';
  }

  /**
   * 기능 및 역할: 참여자 추가 폼과 x 버튼의 동작을 연결한다.
   * 핵심 로직: 이름 검사(빈 이름·동명이인 거부) 통과 시 추가. x 버튼은 활성 상태를 뒤집되,
   *            이미 저장된 지출은 바꾸지 않고 새 지출 입력 폼의 선택만 갱신한다.
   */
  function bindMembers() {
    const { $, state } = ns;
    $('memberForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('memberInput');
      const check = ns.checkMemberName(state.members, input.value);
      if (!check.ok) { if (input.value.trim()) ns.toast(check.error); return; }
      const m = { id: ns.uid(), name: check.name, active: true };
      state.members.push(m);
      ns.form.participants.add(m.id);
      input.value = '';
      ns.commit();
      input.focus();
    });

    $('memberList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-toggle]');
      const m = btn && ns.member(btn.dataset.toggle);
      if (!m) return;
      m.active = !m.active;
      if (!ns.form.editingId) {
        if (m.active) ns.form.participants.add(m.id);
        else { ns.form.participants.delete(m.id); delete ns.form.discounts[m.id]; ns.enforceDiscountRule(); }
      }
      ns.commit();
    });
  }

  ns.renderMembers = renderMembers;
  ns.bindMembers = bindMembers;
})(globalThis.DutchPay = globalThis.DutchPay || {});
