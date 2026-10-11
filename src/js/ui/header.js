// 상단: 모임 이름 입력, 초기화 버튼
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 모임 이름 입력을 저장하고, 초기화 버튼을 처리한다.
   * 핵심 로직: 초기화는 확인 팝업에서 승인해야만 참여자·지출·폼을 모두 비운다.
   */
  function bindHeader() {
    ns.$('groupName').addEventListener('input', (e) => { ns.state.groupName = e.target.value; ns.save(); });
    ns.$('resetBtn').addEventListener('click', async () => {
      const ok = await ns.ask('초기화', '모든 참여자와 지출 내역을 지울까요?', [
        { label: '초기화', value: true, cls: 'danger' },
        { label: '취소', value: null, cls: 'ghost' },
      ]);
      if (!ok) return;
      ns.resetState();
      ns.resetForm();
      ns.commit();
    });
  }

  ns.bindHeader = bindHeader;
})(globalThis.DutchPay = globalThis.DutchPay || {});
