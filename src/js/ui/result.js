// 3. 정산 결과: 총 지출 요약, 사람별 낸 돈/쓴 돈/차액, 송금 목록
(function (ns) {
  'use strict';

  /** 기능 및 역할: 사람별 표(낸 돈·쓴 돈·차액)를 HTML로 만든다. 차액 +는 받을 돈, -는 보낼 돈. */
  function balanceTable(balances) {
    const { esc, won } = ns;
    if (!balances.length) return '<p class="muted">참여자와 지출을 입력하면 자동으로 계산돼요.</p>';
    const rows = balances.map((b) => {
      const cls = b.net > 0 ? 'pos' : b.net < 0 ? 'neg' : '';
      return `<tr class="${b.active ? '' : 'off'}"><td>${esc(b.name)}</td><td>${won(b.paid)}</td><td>${won(b.owed)}</td><td class="${cls}">${b.net > 0 ? '+' : ''}${won(b.net)}</td></tr>`;
    }).join('');
    return `<table><thead><tr><th>이름</th><th>낸 돈</th><th>쓴 돈</th><th>차액</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  /**
   * 기능 및 역할: 정산 결과 영역 전체를 다시 그린다.
   * 핵심 로직: computeAll 결과(요약·표·송금)를 화면에 넣고, 계산된 지출이 없으면 복사 버튼을 끈다.
   */
  function renderResult() {
    const { state, $, esc, won } = ns;
    const r = ns.computeAll(state.members, state.expenses);
    $('balances').innerHTML = balanceTable(r.balances);
    $('transfers').innerHTML = r.transfers.length
      ? r.transfers.map((t) => `<li><span>${esc(t.fromName)}</span><span class="arrow">→</span><span>${esc(t.toName)}</span><span class="amt">${won(t.amount)}</span></li>`).join('')
      : `<li class="empty">${r.included.length ? '모두 정산 완료! 보낼 돈이 없어요.' : '아직 송금할 내역이 없어요.'}</li>`;
    const cnt = r.balances.length;
    $('summary').innerHTML = r.included.length
      ? `<small>총 지출</small><strong>${won(r.total)}</strong> <span>· ${cnt}명 · 1인 평균 ${won(Math.round(r.total / Math.max(1, cnt)))}</span>`
      : '<small>총 지출</small><strong>0원</strong>';
    $('copyBtn').disabled = !r.included.length;
  }

  ns.renderResult = renderResult;
})(globalThis.DutchPay = globalThis.DutchPay || {});
