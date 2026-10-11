# memory (claude code용 흐름 기록, 최소 기록)

- 2026-10-11 23:19 KST | phase2/claude | src를 모듈형으로 재구현: `src/js/core`(계산, 전역 `globalThis.DutchPay` 네임스페이스) / `data/store.js` / `ui/*` / `app.js`, CSS는 `src/css/*`. 파일당 ≤100줄·한글 주석(coding.md).
- 같은 이유(file://에서 ES module 불가)로 classic script 사용. 로드 순서는 index.html 기준: core → store → ui → app.
- 테스트: `scripts/test/loadCore.js`가 core를 vm으로 불러옴. `node scripts/test/run_tests.js` → 133건 PASS (test05, ver1.4).
- 확정 규칙: 감면 대상 0~N-1명, 비활성화는 기존 지출 불변(수정에서 해제), 감면율 정수 0~100, 동명이인 거부, 잔여 방식 payer/random(seed 저장).
- 이전 방식(phase2-doc: settle.js 단일 파일 + app.js 330줄)도 동작은 동일. 비교는 docs/reflection/phase2-doc.md 참고.
- push는 자격증명(PAT) 없어 미완료 상태일 수 있음.
