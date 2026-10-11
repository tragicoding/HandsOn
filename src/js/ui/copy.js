// 3. 결과 텍스트 복사: 단톡방에 붙여넣을 글을 만들어 클립보드에 복사한다.
(function (ns) {
  'use strict';

  /**
   * 기능 및 역할: 복사할 정산 글을 만든다.
   * 핵심 로직: [모임 정산] 제목 / 총 지출 · 인원 / ■ 지출 내역 / ■ 송금 순서로 줄을 쌓는다.
   */
  function buildText() {
    const { state, won, nameOf, member } = ns;
    const r = ns.computeAll(state.members, state.expenses);
    const included = state.expenses.filter((x) => r.included.includes(x.id));
    const lines = [`[${state.groupName.trim() || '모임'} 정산]`, `총 지출 ${won(r.total)} · ${r.balances.length}명`, '', '■ 지출 내역'];
    included.forEach((x) => {
      const n = x.participants.filter((id) => member(id)).length;
      lines.push(`- ${x.title} ${won(x.amount)} (${nameOf(x.payer)} 결제, ${n}명)`);
    });
    lines.push('', '■ 송금');
    if (!r.transfers.length) lines.push('보낼 돈이 없어요');
    r.transfers.forEach((t) => lines.push(`${t.fromName} → ${t.toName} ${won(t.amount)}`));
    return lines.join('\n');
  }

  /**
   * 기능 및 역할: 글을 클립보드에 복사한다.
   * 핵심 로직: clipboard API를 먼저 쓰고, 못 쓰는 환경이면 임시 textarea + execCommand로 복사한다.
   */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      ns.toast('복사했어요. 단톡방에 붙여넣으세요!');
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ns.toast('복사했어요'); } catch (__) { ns.toast('복사에 실패했어요'); }
      ta.remove();
    }
  }

  ns.buildText = buildText;
  ns.bindCopy = () => ns.$('copyBtn').addEventListener('click', () => copyText(buildText()));
})(globalThis.DutchPay = globalThis.DutchPay || {});
