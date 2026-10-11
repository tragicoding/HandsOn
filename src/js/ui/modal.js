// 팝업(모달): 나누어떨어지지 않을 때 / 초기화 확인 등에서 사용
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 제목·설명·버튼을 가진 팝업을 띄우고, 사용자가 누른 버튼의 값을 돌려준다.
   * 핵심 로직: Promise(나중에 결과를 알려주는 약속)를 만들어 버튼을 누르면 resolve한다.
   *            바깥을 누르거나 값이 null인 버튼을 누르면 취소(null)이다.
   * buttons: [{ label, value, cls }]
   */
  function ask(title, msg, buttons) {
    const { $ } = ns;
    return new Promise((resolve) => {
      $('modalTitle').textContent = title;
      $('modalMsg').textContent = msg;
      const box = $('modalBtns');
      box.innerHTML = '';
      const done = (v) => { $('modal').hidden = true; resolve(v); };
      buttons.forEach((b) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'btn ' + (b.cls || '');
        el.textContent = b.label;
        el.addEventListener('click', () => done(b.value));
        box.appendChild(el);
      });
      $('modal').onclick = (e) => { if (e.target === $('modal')) done(null); };
      $('modal').hidden = false;
    });
  }

  ns.ask = ask;
})(globalThis.DutchPay = globalThis.DutchPay || {});
