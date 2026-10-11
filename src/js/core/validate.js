// 입력 검증 (화면과 무관, Node에서도 테스트 가능)
// 규칙 출처: docs/PRD.md, docs/requirements.md (감면 대상 0명 이상 N-1명 이하 등)
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 감면을 받는 사람 수를 센다. (감면율 0%는 감면 대상이 아니다)
   * 핵심 로직: 함께하는 사람 중 감면율이 1 이상인 사람만 센다.
   */
  function countDiscounted(participants, discounts) {
    return participants.filter((id) => Number(discounts && discounts[id]) > 0).length;
  }

  /**
   * 기능 및 역할: 감면 대상 수가 규칙(0명 이상 N-1명 이하)을 지키는지 검사한다.
   * 핵심 로직: 감면 대상이 전원이면 줄어든 금액을 나눠 낼 사람이 없으므로 허용하지 않는다.
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
   * 핵심 로직: 금액(1원 이상) -> 결제자 존재 -> 함께한 사람 1명 이상 -> 결제자가 함께한 사람에 포함 ->
   *            감면율 정수 -> 감면 대상 수 순서로 확인하고 처음 걸린 문제의 안내 문구를 돌려준다.
   *            memberIds는 현재 있는 참여자 id 목록이다.
   */
  function validateExpense(exp, memberIds) {
    const amount = Math.floor(Number(exp && exp.amount));
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: '금액을 입력하세요' };
    if (!memberIds.includes(exp.payer)) return { ok: false, error: '결제한 사람을 선택하세요' };
    const parts = (exp.participants || []).filter((id) => memberIds.includes(id));
    if (!parts.length) return { ok: false, error: '함께 쓴 사람을 한 명 이상 선택하세요' };
    if (!parts.includes(exp.payer)) return { ok: false, error: '결제한 사람은 함께 쓴 사람에 포함되어야 해요' };
    const rate = checkDiscountRates(parts, exp.discounts);
    return rate.ok ? checkDiscountCount(parts, exp.discounts) : rate;
  }

  /**
   * 기능 및 역할: 감면율이 0~100의 정수인지 검사한다. (소수나 범위 밖 값은 예외처리로 거부)
   * 핵심 로직: 함께한 사람의 감면율 값마다 Number.isInteger와 0~100 범위를 확인한다. 값이 없으면 감면 없음.
   */
  function checkDiscountRates(participants, discounts) {
    for (const id of participants) {
      const v = discounts && discounts[id];
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'boolean' || !Number.isInteger(Number(v)) || Number(v) < 0 || Number(v) > 100) {
        return { ok: false, error: '감면율은 0~100의 정수만 입력할 수 있어요' };
      }
    }
    return { ok: true };
  }

  /**
   * 기능 및 역할: 새 참여자 이름을 정리한다. 빈 이름은 거부하고, 동명이인은 (1), (2) 식으로 구분한다.
   * 핵심 로직: 이름 끝의 "(숫자)"를 뗀 기본 이름이 같은 사람들을 한 그룹으로 본다.
   *            그룹이 없으면 입력 그대로, 있으면 번호 없는 기존 이름은 (1)로 바꾸고(renames에 담음)
   *            새 사람은 가장 큰 번호 + 1을 받는다.
   * 반환: { ok, name, renames: [{ id, name }] } 또는 { ok: false, error }
   */
  function checkMemberName(members, name) {
    const n = String(name || '').trim();
    if (!n) return { ok: false, error: '이름을 입력하세요' };
    const base = (v) => v.replace(/\((\d+)\)$/, '');
    const group = members.filter((m) => base(m.name) === base(n));
    if (!group.length) return { ok: true, name: n, renames: [] };
    const numOf = (m) => { const t = /\((\d+)\)$/.exec(m.name); return t ? Number(t[1]) : 0; };
    const renames = group.filter((m) => numOf(m) === 0).map((m) => ({ id: m.id, name: `${m.name}(1)` }));
    const next = Math.max(...group.map((m) => numOf(m) || 1)) + 1;
    return { ok: true, name: `${base(n)}(${next})`, renames };
  }

  ns.countDiscounted = countDiscounted;
  ns.checkDiscountCount = checkDiscountCount;
  ns.checkDiscountRates = checkDiscountRates;
  ns.validateExpense = validateExpense;
  ns.checkMemberName = checkMemberName;
})(globalThis.DutchPay = globalThis.DutchPay || {});
