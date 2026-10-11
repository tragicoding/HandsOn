// 재현 가능한 난수 (같은 seed -> 같은 결과)
// "랜덤 배분" 결과를 저장해 두었다가 다시 계산해도 같은 결과가 나오게 하기 위해 쓴다.
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: seed(씨앗 숫자)로 0 이상 1 미만의 난수를 만드는 함수를 돌려준다.
   * 핵심 로직: mulberry32 방식. 같은 seed로 만들면 항상 같은 순서의 숫자가 나온다.
   */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 기능 및 역할: 배열의 순서를 seed에 따라 섞은 새 배열을 돌려준다. (원본은 바꾸지 않음)
   * 핵심 로직: 뒤에서부터 한 칸씩, 앞쪽의 임의 위치와 자리를 바꾼다(피셔-예이츠 방식).
   */
  function shuffle(arr, seed) {
    const a = arr.slice();
    const rand = rng(seed);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  ns.rng = rng;
  ns.shuffle = shuffle;
})(globalThis.DutchPay = globalThis.DutchPay || {});
