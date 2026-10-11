# memory (claude code용 흐름 기록, 최소 기록)

- 2026-10-11 23:19 KST | phase2/claude | src를 모듈형으로 재구현: `src/js/core`(계산, 전역 `globalThis.DutchPay` 네임스페이스) / `data/store.js` / `ui/*` / `app.js`, CSS는 `src/css/*`. 파일당 ≤100줄·한글 주석(coding.md).
- 같은 이유(file://에서 ES module 불가)로 classic script 사용. 로드 순서는 index.html 기준: core → store → ui → app.
- 테스트: `scripts/test/loadCore.js`가 core를 vm으로 불러옴. `node scripts/test/run_tests.js` → 133건 PASS (test05, ver1.4).
- 확정 규칙: 감면 대상 0~N-1명, 비활성화는 기존 지출 불변(수정에서 해제), 감면율 정수 0~100, 동명이인 거부, 잔여 방식 payer/random(seed 저장).
- 이전 방식(phase2-doc: settle.js 단일 파일 + app.js 330줄)도 동작은 동일. 비교는 docs/reflection/phase2-doc.md 참고.
- push는 자격증명(PAT) 없어 미완료 상태일 수 있음.

- 2026-10-12 00:07 KST | phase2/claude | 규칙 변경: 감면율 정수만(소수 거부) / 동명이인 (1),(2).. 자동 번호 / 결제자는 반드시 함께한 사람 포함(아니면 거부) / 수정 저장 시 이미 고른 잔여 방식 유지(처음 나누어떨어지지 않게 될 때만 팝업). 테스트 153건 PASS(test06, ver1.5). 스크린샷 phase2-claude-01~17. 다음: phase2/doc에 같은 test 적용.

- 2026-10-12 00:44 KST | phase2/claude | phase0(`dutch-pay/`: settle.js 단순 N분의1, 체크박스, 삭제형 x, confirm 창)에 같은 테스트 적용: 153건 중 PASS 84 / FAIL 69 (test07). phase0는 감면·잔여·비활성·검증·동명이인 없음(기록용, 수정 안 함). 실행: `node scripts/test/run_phase0.js` (git origin/phase0에서 소스를 꺼냄).
