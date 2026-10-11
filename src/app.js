(function () {
  'use strict';
  const KEY = 'dutchpay:phase2-doc:v1';
  const $ = (id) => document.getElementById(id);
  const won = (n) => Number(n).toLocaleString('ko-KR') + '원';
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- 상태 (localStorage에 저장 -> 새로고침해도 유지) ----------
  let state = load();
  // 지출 입력 폼의 임시 상태 (저장하지 않음)
  const form = { participants: new Set(), discounts: {}, editingId: null, touched: false };

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.members) && Array.isArray(s.expenses)) return s;
    } catch (_) { /* 저장소를 못 읽으면 빈 상태로 시작 */ }
    return { groupName: '', members: [], expenses: [] };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* 저장 실패는 무시 */ } }
  function commit() { save(); render(); }

  const member = (id) => state.members.find((m) => m.id === id);
  const nameOf = (id) => (member(id) || {}).name || '(알 수 없음)';
  const activeIds = () => state.members.filter((m) => m.active).map((m) => m.id);

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 1900);
  }

  // ---------- 팝업 ----------
  // buttons: [{label, value, cls}] -> 눌린 value (취소/바깥 클릭이면 null)
  function ask(title, msg, buttons) {
    return new Promise((resolve) => {
      $('modalTitle').textContent = title;
      $('modalMsg').textContent = msg;
      const box = $('modalBtns');
      box.innerHTML = '';
      const done = (v) => { $('modal').hidden = true; resolve(v); };
      buttons.forEach((b) => {
        const el = document.createElement('button');
        el.type = 'button'; el.className = 'btn ' + (b.cls || ''); el.textContent = b.label;
        el.addEventListener('click', () => done(b.value));
        box.appendChild(el);
      });
      $('modal').onclick = (e) => { if (e.target === $('modal')) done(null); };
      $('modal').hidden = false;
    });
  }

  // ---------- 1. 참여자 ----------
  $('memberForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('memberInput');
    const name = input.value.trim();
    if (!name) return;
    if (state.members.some((m) => m.name === name)) { toast(`'${name}'은(는) 이미 있어요`); return; }
    const m = { id: uid(), name, active: true };
    state.members.push(m);
    form.participants.add(m.id);
    input.value = '';
    commit();
    input.focus();
  });

  // x를 누르면 삭제가 아니라 비활성화(색만 바뀜). 다시 누르면 활성화.
  $('memberList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle]');
    if (!btn) return;
    const m = member(btn.dataset.toggle);
    if (!m) return;
    m.active = !m.active;
    if (m.active) form.participants.add(m.id);
    else { form.participants.delete(m.id); delete form.discounts[m.id]; }
    commit();
  });

  // ---------- 2. 지출 입력 ----------
  const amountEl = $('expAmount');
  amountEl.addEventListener('input', () => {
    const digits = amountEl.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
    amountEl.value = digits ? Number(digits).toLocaleString('ko-KR') : '';
  });
  const readAmount = () => Number(amountEl.value.replace(/[^\d]/g, '')) || 0;

  $('toggleAll').addEventListener('click', () => {
    const ids = activeIds();
    const allOn = ids.length > 0 && ids.every((id) => form.participants.has(id));
    form.participants = new Set(allOn ? [] : ids);
    Object.keys(form.discounts).forEach((id) => { if (!form.participants.has(id)) delete form.discounts[id]; });
    renderForm();
  });

  $('expParticipants').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const id = b.dataset.id;
    if (form.participants.has(id)) { form.participants.delete(id); delete form.discounts[id]; }
    else form.participants.add(id);
    renderForm();
  });

  $('expDiscounts').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const id = b.dataset.id;
    if (id in form.discounts) delete form.discounts[id];
    else form.discounts[id] = 10;
    renderForm();
  });

  $('discountInputs').addEventListener('input', (e) => {
    const el = e.target.closest('input[data-id]');
    if (!el) return;
    const v = el.value.replace(/[^\d]/g, '').slice(0, 3);
    el.value = v;
    form.discounts[el.dataset.id] = Math.min(100, Number(v) || 0);
  });

  $('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeIds().length) return toast('먼저 참여자를 추가하세요');
    const title = $('expTitle').value.trim();
    const amount = readAmount();
    const payer = $('expPayer').value;
    const participants = [...form.participants].filter((id) => activeIds().includes(id));
    if (!title) return toast('항목을 입력하세요');
    if (!amount) return toast('금액을 입력하세요');
    if (!payer) return toast('결제한 사람을 선택하세요');
    if (!participants.length) return toast('함께 쓴 사람을 한 명 이상 선택하세요');

    const discounts = {};
    participants.forEach((id) => { if (form.discounts[id] > 0) discounts[id] = Settle.toPct(form.discounts[id]); });

    // 나누어떨어지지 않으면 잔여 처리 방식을 묻는다
    const exp = { id: form.editingId || uid(), title, amount, payer, participants, discounts, mode: 'payer', seed: 1 };
    const rest = Settle.remainderOf(amount, participants, discounts);
    if (rest > 0) {
      const choice = await ask(
        '나누어떨어지지 않아요',
        `${won(rest)}이 남아요. 남는 금액을 어떻게 처리할까요?`,
        [
          { label: `결제자가 내기 (${nameOf(payer)})`, value: 'payer', cls: 'primary' },
          { label: '랜덤', value: 'random' },
          { label: '취소', value: null, cls: 'ghost' },
        ]
      );
      if (!choice) return;
      exp.mode = choice;
      if (choice === 'random') exp.seed = 1 + Math.floor(Math.random() * 2147483646); // 저장해서 재계산해도 같은 결과
    }

    if (form.editingId) {
      state.expenses = state.expenses.map((x) => (x.id === form.editingId ? exp : x));
      toast('수정했어요');
    } else {
      state.expenses.push(exp);
    }
    resetForm();
    commit();
  });

  $('cancelEdit').addEventListener('click', () => { resetForm(); renderForm(); renderExpenses(); });

  function resetForm() {
    form.editingId = null;
    form.discounts = {};
    form.participants = new Set(activeIds());
    $('expTitle').value = '';
    amountEl.value = '';
  }

  $('expenseList').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    const edit = e.target.closest('[data-edit]');
    if (del) {
      state.expenses = state.expenses.filter((x) => x.id !== del.dataset.del);
      if (form.editingId === del.dataset.del) resetForm();
      commit();
    } else if (edit) {
      const x = state.expenses.find((v) => v.id === edit.dataset.edit);
      if (!x) return;
      form.editingId = x.id;
      form.participants = new Set(x.participants.filter((id) => member(id) && member(id).active));
      form.discounts = Object.assign({}, x.discounts || {});
      Object.keys(form.discounts).forEach((id) => { if (!form.participants.has(id)) delete form.discounts[id]; });
      render();
      $('expTitle').value = x.title;
      amountEl.value = Number(x.amount).toLocaleString('ko-KR');
      if (member(x.payer) && member(x.payer).active) $('expPayer').value = x.payer;
      $('expenseForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // ---------- 기타 ----------
  $('groupName').addEventListener('input', (e) => { state.groupName = e.target.value; save(); });

  $('resetBtn').addEventListener('click', async () => {
    const ok = await ask('초기화', '모든 참여자와 지출 내역을 지울까요?', [
      { label: '초기화', value: true, cls: 'danger' },
      { label: '취소', value: null, cls: 'ghost' },
    ]);
    if (!ok) return;
    state = { groupName: '', members: [], expenses: [] };
    resetForm();
    commit();
  });

  function buildText() {
    const r = Settle.computeAll(state.members, state.expenses);
    const included = state.expenses.filter((x) => r.included.includes(x.id));
    const count = state.members.filter((m) => m.active).length;
    const lines = [`[${state.groupName.trim() || '모임'} 정산]`, `총 지출 ${won(r.total)} · ${count}명`, ''];
    lines.push('■ 지출 내역');
    included.forEach((x) => {
      const n = x.participants.filter((id) => member(id) && member(id).active).length;
      lines.push(`- ${x.title} ${won(x.amount)} (${nameOf(x.payer)} 결제, ${n}명)`);
    });
    lines.push('', '■ 송금');
    if (!r.transfers.length) lines.push('보낼 돈이 없어요');
    r.transfers.forEach((t) => lines.push(`${t.fromName} → ${t.toName} ${won(t.amount)}`));
    return lines.join('\n');
  }

  $('copyBtn').addEventListener('click', async () => {
    const text = buildText();
    try {
      await navigator.clipboard.writeText(text);
      toast('복사했어요. 단톡방에 붙여넣으세요!');
    } catch (_) {
      // clipboard API를 못 쓰는 환경: 임시 textarea로 복사
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('복사했어요'); } catch (__) { toast('복사에 실패했어요'); }
      ta.remove();
    }
  });

  // ---------- 렌더 ----------
  function renderMembers() {
    $('memberList').innerHTML = state.members.length
      ? state.members.map((m) => `<li class="chip${m.active ? '' : ' off'}">${esc(m.name)}<button type="button" data-toggle="${m.id}" aria-label="${esc(m.name)} ${m.active ? '비활성화' : '활성화'}">×</button></li>`).join('')
      : '<li class="empty">아직 참여자가 없어요.</li>';
  }

  function renderForm() {
    const act = state.members.filter((m) => m.active);
    const payerSel = $('expPayer');
    const prev = payerSel.value;
    payerSel.innerHTML = act.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
    if (act.some((m) => m.id === prev)) payerSel.value = prev;

    $('expParticipants').innerHTML = act.length
      ? act.map((m) => `<button type="button" class="toggle${form.participants.has(m.id) ? ' on' : ''}" data-id="${m.id}">${esc(m.name)}</button>`).join('')
      : '<span class="muted">참여자를 먼저 추가하세요</span>';

    const sel = act.filter((m) => form.participants.has(m.id));
    $('expDiscounts').innerHTML = sel.length
      ? sel.map((m) => `<button type="button" class="toggle disc${m.id in form.discounts ? ' on' : ''}" data-id="${m.id}">${esc(m.name)}</button>`).join('')
      : '<span class="muted">함께 쓴 사람을 선택하세요</span>';

    // 감면 대상별 % 입력칸 (입력 중 포커스를 잃지 않도록 구조가 같으면 값만 유지)
    const di = $('discountInputs');
    di.innerHTML = Object.keys(form.discounts).filter((id) => member(id)).map((id) =>
      `<div class="disc-row"><label for="disc-${id}">${esc(nameOf(id))} 감면율</label><input id="disc-${id}" data-id="${id}" type="text" inputmode="numeric" value="${form.discounts[id]}" /><span>%</span></div>`
    ).join('');

    $('expSubmit').textContent = form.editingId ? '수정 저장' : '지출 추가';
    $('cancelEdit').hidden = !form.editingId;
  }

  function renderExpenses() {
    const r = Settle.computeAll(state.members, state.expenses);
    $('expenseList').innerHTML = state.expenses.length
      ? state.expenses.map((x) => {
          const ids = x.participants.filter((id) => member(id) && member(id).active);
          const skipped = !r.included.includes(x.id);
          const allActive = ids.length === state.members.filter((m) => m.active).length;
          const who = allActive ? '전원' : ids.map(nameOf).map(esc).join(', ');
          const per = ids.length ? Math.floor(x.amount / ids.length) : 0;
          const discs = Object.keys(x.discounts || {}).filter((id) => ids.includes(id)).map((id) => `${esc(nameOf(id))} ${x.discounts[id]}% 감면`);
          const mode = ids.length && Settle.remainderOf(x.amount, ids, x.discounts) > 0 ? (x.mode === 'random' ? ' · 잔여 랜덤' : ' · 잔여 결제자 부담') : '';
          return `<li class="expense${x.id === form.editingId ? ' editing' : ''}">
            <div class="exp-main"><strong>${esc(x.title)}</strong><span class="amount">${won(x.amount)}</span></div>
            <div class="exp-sub">${esc(nameOf(x.payer))} 결제 · ${who} (${ids.length}명, 1인 약 ${won(per)})${discs.length ? ' · ' + discs.join(', ') : ''}${mode}</div>
            ${skipped ? '<div class="excluded">정산 대상이 없어 계산에서 제외됐어요</div>' : ''}
            <div class="exp-actions">
              <button type="button" class="link" data-edit="${x.id}">수정</button>
              <button type="button" class="link danger" data-del="${x.id}">삭제</button>
            </div>
          </li>`;
        }).join('')
      : '<li class="empty">지출을 추가하면 여기에 쌓여요.</li>';
    const n = Math.max(1, state.members.filter((m) => m.active).length);
    $('totalLine').innerHTML = r.included.length ? `총 지출 <strong>${won(r.total)}</strong> · 1인 평균 ${won(Math.round(r.total / n))}` : '';
  }

  function renderResult() {
    const r = Settle.computeAll(state.members, state.expenses);
    $('balances').innerHTML = r.balances.length
      ? `<table><thead><tr><th>이름</th><th>낸 돈</th><th>쓴 돈</th><th>차액</th></tr></thead><tbody>${r.balances.map((b) =>
          `<tr class="${b.active ? '' : 'off'}"><td>${esc(b.name)}</td><td>${won(b.paid)}</td><td>${won(b.owed)}</td><td class="${b.net > 0 ? 'pos' : b.net < 0 ? 'neg' : ''}">${b.net > 0 ? '+' : ''}${won(b.net)}</td></tr>`).join('')}</tbody></table>`
      : '<p class="muted">참여자와 지출을 입력하면 자동으로 계산돼요.</p>';
    $('transfers').innerHTML = r.transfers.length
      ? r.transfers.map((t) => `<li><span>${esc(t.fromName)}</span><span class="arrow">→</span><span>${esc(t.toName)}</span><span class="amt">${won(t.amount)}</span></li>`).join('')
      : `<li class="empty">${r.included.length ? '모두 정산 완료! 보낼 돈이 없어요.' : '아직 송금할 내역이 없어요.'}</li>`;
    const cnt = state.members.filter((m) => m.active).length;
    $('summary').innerHTML = r.included.length
      ? `<small>총 지출</small><strong>${won(r.total)}</strong> <span>· ${cnt}명 · 1인 평균 ${won(Math.round(r.total / Math.max(1, cnt)))}</span>`
      : '<small>총 지출</small><strong>0원</strong>';
    $('copyBtn').disabled = !r.included.length;
  }

  function render() {
    $('groupName').value = state.groupName || '';
    renderMembers();
    renderForm();
    renderExpenses();
    renderResult();
  }

  // 처음 열 때: 저장된 참여자는 모두 폼에서 선택된 상태로 시작
  form.participants = new Set(activeIds());
  render();
})();
