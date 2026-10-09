(function () {
  const STORAGE_KEY = 'dutchpay:v1';
  const $ = (id) => document.getElementById(id);
  const won = (n) => n.toLocaleString('ko-KR') + '원';
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let state = load();
  let editingId = null;

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (s && Array.isArray(s.members) && Array.isArray(s.expenses)) return s;
    } catch (_) {}
    return { groupName: '', members: [], expenses: [] };
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function commit() { save(); render(); }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1800);
  }

  const nameOf = (id) => (state.members.find((m) => m.id === id) || {}).name || '(삭제됨)';

  // ---------- 멤버 ----------
  $('memberForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('memberInput');
    const names = input.value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    let added = 0;
    for (const name of names) {
      if (state.members.some((m) => m.name === name)) { toast(`'${name}'은(는) 이미 있어요`); continue; }
      state.members.push({ id: uid(), name });
      added++;
    }
    input.value = '';
    if (added) commit();
  });

  $('memberList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const id = btn.dataset.remove;
    const used = state.expenses.some((x) => x.payer === id || x.participants.includes(id));
    if (used && !confirm(`${nameOf(id)}님이 포함된 지출이 있어요. 삭제하면 해당 지출에서 빠지고, 결제자인 지출은 함께 삭제됩니다. 계속할까요?`)) return;
    state.members = state.members.filter((m) => m.id !== id);
    state.expenses = state.expenses
      .filter((x) => x.payer !== id)
      .map((x) => ({ ...x, participants: x.participants.filter((p) => p !== id) }))
      .filter((x) => x.participants.length);
    commit();
  });

  // ---------- 지출 ----------
  const amountInput = $('expAmount');
  amountInput.addEventListener('input', () => {
    const digits = amountInput.value.replace(/[^\d]/g, '').slice(0, 12);
    amountInput.value = digits ? Number(digits).toLocaleString('ko-KR') : '';
  });

  $('toggleAll').addEventListener('click', () => {
    const boxes = [...$('expParticipants').querySelectorAll('input')];
    const allOn = boxes.every((b) => b.checked);
    boxes.forEach((b) => (b.checked = !allOn));
  });

  $('expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.members.length === 0) return toast('먼저 참여자를 추가하세요');
    const title = $('expTitle').value.trim();
    const amount = Number(amountInput.value.replace(/[^\d]/g, ''));
    const payer = $('expPayer').value;
    const participants = [...$('expParticipants').querySelectorAll('input:checked')].map((b) => b.value);
    if (!title) return toast('항목을 입력하세요');
    if (!amount) return toast('금액을 입력하세요');
    if (!payer) return toast('결제한 사람을 선택하세요');
    if (!participants.length) return toast('함께 쓴 사람을 한 명 이상 선택하세요');

    if (editingId) {
      state.expenses = state.expenses.map((x) => (x.id === editingId ? { ...x, title, amount, payer, participants } : x));
      toast('수정했어요');
    } else {
      state.expenses.push({ id: uid(), title, amount, payer, participants });
    }
    resetExpenseForm();
    commit();
  });

  $('cancelEdit').addEventListener('click', () => { resetExpenseForm(); render(); });

  function resetExpenseForm() {
    editingId = null;
    $('expTitle').value = '';
    amountInput.value = '';
  }

  $('expenseList').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    const edit = e.target.closest('[data-edit]');
    if (del) {
      state.expenses = state.expenses.filter((x) => x.id !== del.dataset.del);
      if (editingId === del.dataset.del) resetExpenseForm();
      commit();
    } else if (edit) {
      const x = state.expenses.find((v) => v.id === edit.dataset.edit);
      if (!x) return;
      editingId = x.id;
      render();
      $('expTitle').value = x.title;
      amountInput.value = x.amount.toLocaleString('ko-KR');
      $('expPayer').value = x.payer;
      $('expParticipants').querySelectorAll('input').forEach((b) => (b.checked = x.participants.includes(b.value)));
      $('expenseForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // ---------- 기타 ----------
  $('groupName').addEventListener('input', (e) => { state.groupName = e.target.value; save(); });

  $('resetBtn').addEventListener('click', () => {
    if (!confirm('모든 참여자와 지출 내역을 지울까요?')) return;
    state = { groupName: '', members: [], expenses: [] };
    resetExpenseForm();
    commit();
  });

  $('copyBtn').addEventListener('click', async () => {
    const text = buildSummary();
    try {
      await navigator.clipboard.writeText(text);
      toast('복사했어요. 단톡방에 붙여넣으세요!');
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('복사했어요'); } catch (__) { toast('복사에 실패했어요'); }
      ta.remove();
    }
  });

  function buildSummary() {
    const balances = Settle.computeBalances(state.members, state.expenses);
    const transfers = Settle.computeTransfers(balances);
    const total = state.expenses.reduce((s, x) => s + x.amount, 0);
    const lines = [`[${state.groupName || '모임'} 정산]`, `총 지출 ${won(total)} · ${state.members.length}명`, ''];
    lines.push('■ 지출 내역');
    state.expenses.forEach((x) => lines.push(`- ${x.title} ${won(x.amount)} (${nameOf(x.payer)} 결제, ${x.participants.length}명)`));
    lines.push('', '■ 송금');
    if (!transfers.length) lines.push('보낼 돈이 없어요');
    transfers.forEach((t) => lines.push(`${t.fromName} → ${t.toName} ${won(t.amount)}`));
    return lines.join('\n');
  }

  // ---------- 렌더 ----------
  function render() {
    $('groupName').value = state.groupName || '';

    $('memberList').innerHTML = state.members.length
      ? state.members.map((m) => `<li class="chip">${esc(m.name)}<button type="button" data-remove="${m.id}" aria-label="${esc(m.name)} 삭제">×</button></li>`).join('')
      : '<li class="empty">아직 참여자가 없어요. 쉼표로 여러 명을 한 번에 넣을 수 있어요.</li>';

    // 결제자 셀렉트 (선택값 유지)
    const payerSel = $('expPayer');
    const prevPayer = payerSel.value;
    payerSel.innerHTML = state.members.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
    if (state.members.some((m) => m.id === prevPayer)) payerSel.value = prevPayer;

    // 참여자 체크박스 (기본: 전원 선택, 기존 체크 상태 유지)
    const box = $('expParticipants');
    const prev = new Map([...box.querySelectorAll('input')].map((b) => [b.value, b.checked]));
    box.innerHTML = state.members.map((m) => {
      const checked = prev.has(m.id) ? prev.get(m.id) : true;
      return `<label class="check"><input type="checkbox" value="${m.id}" ${checked ? 'checked' : ''}/><span>${esc(m.name)}</span></label>`;
    }).join('') || '<span class="muted">참여자를 먼저 추가하세요</span>';

    $('expSubmit').textContent = editingId ? '수정 저장' : '지출 추가';
    $('cancelEdit').hidden = !editingId;

    // 지출 목록
    const total = state.expenses.reduce((s, x) => s + x.amount, 0);
    $('expenseList').innerHTML = state.expenses.length
      ? state.expenses.map((x) => {
          const per = Math.floor(x.amount / x.participants.length);
          const who = x.participants.length === state.members.length ? '전원' : x.participants.map(nameOf).map(esc).join(', ');
          return `<li class="expense${x.id === editingId ? ' editing' : ''}">
            <div class="exp-main">
              <strong>${esc(x.title)}</strong>
              <span class="amount">${won(x.amount)}</span>
            </div>
            <div class="exp-sub">${esc(nameOf(x.payer))} 결제 · ${who} (${x.participants.length}명, 1인 약 ${won(per)})</div>
            <div class="exp-actions">
              <button type="button" class="link" data-edit="${x.id}">수정</button>
              <button type="button" class="link danger" data-del="${x.id}">삭제</button>
            </div>
          </li>`;
        }).join('')
      : '<li class="empty">지출을 추가하면 여기에 쌓여요.</li>';
    $('totalLine').innerHTML = state.expenses.length ? `총 지출 <strong>${won(total)}</strong> · 1인 평균 ${won(Math.round(total / Math.max(1, state.members.length)))}` : '';

    // 정산
    const balances = Settle.computeBalances(state.members, state.expenses);
    const transfers = Settle.computeTransfers(balances);
    $('balances').innerHTML = balances.length
      ? `<table><thead><tr><th>이름</th><th>낸 돈</th><th>쓴 돈</th><th>차액</th></tr></thead><tbody>${balances.map((b) => `
          <tr><td>${esc(b.name)}</td><td>${won(b.paid)}</td><td>${won(b.owed)}</td>
          <td class="${b.net > 0 ? 'pos' : b.net < 0 ? 'neg' : ''}">${b.net > 0 ? '+' : ''}${won(b.net)}</td></tr>`).join('')}</tbody></table>`
      : '<p class="muted">참여자와 지출을 입력하면 자동으로 계산돼요.</p>';

    $('transfers').innerHTML = transfers.length
      ? transfers.map((t) => `<li><span class="from">${esc(t.fromName)}</span><span class="arrow">→</span><span class="to">${esc(t.toName)}</span><span class="amt">${won(t.amount)}</span></li>`).join('')
      : `<li class="empty">${state.expenses.length ? '모두 정산 완료! 보낼 돈이 없어요.' : '아직 송금할 내역이 없어요.'}</li>`;
    $('copyBtn').disabled = !state.expenses.length;
  }

  render();
})();
