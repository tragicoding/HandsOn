// 시작 화면: 화이트/다크 모드 선택, 시작하기 버튼
(function (ns) {
  'use strict';
  const THEME_KEY = 'dutchpay:theme';

  /** 기능 및 역할: 지금 적용된 모드('dark' 또는 'light')를 돌려준다. */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  /**
   * 기능 및 역할: 모드를 즉시 바꾸고, 다음에 열 때도 기억하도록 저장한다.
   * 핵심 로직: <html data-theme> 값만 바꾸면 CSS 색상 변수가 바뀌어 시작 화면과 메인 화면이 함께 바뀐다.
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* 저장 실패는 무시 */ }
    syncModeButtons();
  }

  /** 기능 및 역할: 현재 모드에 해당하는 버튼을 눌린 상태(선택됨)로 표시한다. */
  function syncModeButtons() {
    const theme = currentTheme();
    ns.$('darkBtn').setAttribute('aria-pressed', String(theme === 'dark'));
    ns.$('lightBtn').setAttribute('aria-pressed', String(theme === 'light'));
  }

  /** 기능 및 역할: 시작 화면이 열려 있는 동안 뒤의 메인 화면을 누르거나 탭 이동으로 고르지 못하게 막는다. */
  function setAppLocked(locked) {
    document.querySelectorAll('.top, main').forEach((el) => {
      if (locked) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  /**
   * 기능 및 역할: 시작하기를 누르면 시작 화면을 걷고 현재 모드 그대로 메인 화면을 보여준다.
   * 핵심 로직: leaving 클래스로 부드럽게 사라지게 한 뒤, 전환이 끝나면 화면에서 완전히 제거(hidden)한다.
   */
  function start() {
    const splash = ns.$('splash');
    if (splash.classList.contains('leaving')) return;
    setAppLocked(false);
    document.body.classList.add('app-entering');
    splash.classList.add('leaving');
    document.body.classList.remove('splash-open');
    const finish = () => { splash.hidden = true; };
    splash.addEventListener('transitionend', (e) => { if (e.target === splash && e.propertyName === 'opacity') finish(); }, { once: true });
    setTimeout(finish, 700); // 전환 효과가 꺼진 기기를 위한 안전장치
  }

  function bindSplash() {
    setAppLocked(true);
    syncModeButtons();
    ns.$('darkBtn').addEventListener('click', () => applyTheme('dark'));
    ns.$('lightBtn').addEventListener('click', () => applyTheme('light'));
    ns.$('startBtn').addEventListener('click', start);
    ns.$('splash').setAttribute('tabindex', '-1');
    ns.$('splash').focus({ preventScroll: true }); // 키보드 사용자는 Tab으로 첫 버튼부터 이동
  }

  ns.bindSplash = bindSplash;
})(globalThis.DutchPay = globalThis.DutchPay || {});
