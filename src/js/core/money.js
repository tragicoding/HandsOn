// 금액·비율 값을 안전하게 다루는 함수 모음 (화면과 무관, Node에서도 테스트 가능)
// 모든 파일은 하나의 이름표(DutchPay)에 자신의 함수를 붙여서 서로 사용한다.
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 어떤 값이든 "0 이상의 원 단위 정수"로 바꾼다.
   * 핵심 로직: 숫자로 바꾼 뒤 소수점을 버리고, 숫자가 아니거나 0 이하이면 0을 돌려준다.
   */
  function toWon(v) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /**
   * 기능 및 역할: 감면율(%)을 0~100 사이 정수로 보정한다.
   * 핵심 로직: 반올림한 뒤 0보다 작으면 0, 100보다 크면 100, 숫자가 아니면 0으로 만든다.
   */
  function toPct(v) {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  }

  /**
   * 기능 및 역할: 화면에 보여줄 금액 문자열을 만든다. 예) 60000 -> "60,000원"
   * 핵심 로직: 한국식 천 단위 콤마를 넣고 뒤에 "원"을 붙인다.
   */
  function won(n) {
    return Number(n).toLocaleString('ko-KR') + '원';
  }

  ns.toWon = toWon;
  ns.toPct = toPct;
  ns.won = won;
})(globalThis.DutchPay = globalThis.DutchPay || {});
