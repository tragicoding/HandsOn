// 데이터 저장소: 앱의 모든 데이터(state)를 들고 있고, 브라우저(localStorage)에 저장/복원한다.
// 새로고침해도 입력한 내용이 유지된다. 서버로는 아무것도 보내지 않는다.
(function (ns) {
  'use strict';
  const KEY = 'dutchpay:phase2-claude:v1';

  /**
   * 기능 및 역할: 저장된 데이터를 읽어온다. 없거나 깨져 있으면 빈 상태를 돌려준다.
   * 핵심 로직: localStorage의 JSON을 읽고, 참여자/지출 배열이 있는지 확인한다.
   */
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.members) && Array.isArray(s.expenses)) return s;
    } catch (_) { /* 저장소를 못 읽으면 빈 상태로 시작 */ }
    return { groupName: '', members: [], expenses: [] };
  }

  /** 기능 및 역할: 현재 데이터를 브라우저에 저장한다. (실패해도 앱은 계속 동작) */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(ns.state)); } catch (_) { /* 저장 실패는 무시 */ }
  }

  /** 기능 및 역할: 저장 후 화면을 다시 그린다. (ns.render는 app.js에서 연결) */
  function commit() {
    save();
    ns.render();
  }

  /** 기능 및 역할: 모든 데이터를 지우고 빈 상태로 되돌린다. */
  function resetState() {
    ns.state = { groupName: '', members: [], expenses: [] };
  }

  ns.state = load();
  ns.save = save;
  ns.commit = commit;
  ns.resetState = resetState;
  ns.member = (id) => ns.state.members.find((m) => m.id === id);
  ns.nameOf = (id) => (ns.member(id) || {}).name || '(알 수 없음)';
  ns.activeIds = () => ns.state.members.filter((m) => m.active).map((m) => m.id);
})(globalThis.DutchPay = globalThis.DutchPay || {});
