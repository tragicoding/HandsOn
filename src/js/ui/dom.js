// 화면(DOM) 공통 도구: 요소 찾기, 글자 안전 처리, 안내 문구(토스트)
(function (ns) {
  'use strict';

  /** 기능 및 역할: id로 화면 요소를 찾는다. */
  const $ = (id) => document.getElementById(id);

  /** 기능 및 역할: 임의의 짧은 id를 만든다. (참여자·지출 구분용) */
  const uid = () => Math.random().toString(36).slice(2, 10);

  /**
   * 기능 및 역할: 사용자가 입력한 글자를 화면에 넣어도 안전하게 바꾼다.
   * 핵심 로직: <, >, &, 따옴표를 HTML 기호로 치환해서 스크립트가 실행되지 않게 한다.
   */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /**
   * 기능 및 역할: 화면 아래에 짧은 안내 문구를 잠깐 보여준다.
   * 핵심 로직: 문구를 넣고 show 표시를 켠 뒤 1.9초 후 끈다. 연달아 호출하면 타이머를 새로 건다.
   */
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 1900);
  }

  ns.$ = $;
  ns.uid = uid;
  ns.esc = esc;
  ns.toast = toast;
})(globalThis.DutchPay = globalThis.DutchPay || {});
