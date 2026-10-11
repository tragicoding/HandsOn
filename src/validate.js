// 지출 입력 검증 (화면과 분리되어 Node에서도 테스트 가능)
// 규칙은 docs/PRD.md, docs/requirements.md 를 따른다.
(function (root) {
  'use strict';

  /**
   * 기능 및 역할: 감면을 받는 사람 수를 센다. (감면율 0%는 감면 대상이 아니다)
   * 핵심 로직: 정산에 함께하는 사람 중 감면율이 1 이상인 사람만 센다.
   */
  function countDiscounted(participants, discounts) {
    return participants.filter((id) => Number(discounts && discounts[id]) > 0).length;
  }

  /**
   * 기능 및 역할: 감면 대상 수가 규칙(0명 이상 N-1명 이하)을 지키는지 검사한다.
   * 핵심 로직: 감면 대상이 N명(전원)이면 줄어든 금액을 나눠 낼 사람이 없으므로 허용하지 않는다.
   * 반환: { ok: true } 또는 { ok: false, error: '안내 문구' }
   */
  function checkDiscountCount(participants, discounts) {
    const n = participants.length;
    const k = countDiscounted(participants, discounts);
    if (k > 0 && k >= n) {
      return { ok: false, error: `감면 대상은 0명 이상 N-1명 이하만 가능해요 (${n}명 중 ${k}명 선택됨)` };
    }
    return { ok: true };
  }

  /**
   * 기능 및 역할: 지출 한 건을 저장하기 전에 입력이 올바른지 검사한다.
   * 핵심 로직: 금액(1원 이상) -> 결제자 존재 -> 함께한 사람 1명 이상 -> 감면 대상 수 규칙 순서로 확인하고,
   *            처음 걸린 문제의 안내 문구를 돌려준다.
   * memberIds: 현재 존재하는 참여자 id 목록
   */
  function validateExpense(exp, memberIds) {
    const amount = Math.floor(Number(exp && exp.amount));
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: '금액을 입력하세요' };
    if (!memberIds.includes(exp.payer)) return { ok: false, error: '결제한 사람을 선택하세요' };
    const parts = (exp.participants || []).filter((id) => memberIds.includes(id));
    if (!parts.length) return { ok: false, error: '함께 쓴 사람을 한 명 이상 선택하세요' };
    return checkDiscountCount(parts, exp.discounts);
  }

  const api = { countDiscounted, checkDiscountCount, validateExpense };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Validate = api;
})(typeof self !== 'undefined' ? self : this);
