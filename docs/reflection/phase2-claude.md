# phase2/claude.md

## 실행전 변경사항
- CLAUDE.md에 "명세서, 구현상 애매한 지점은 Developer에게 질문한다." 추가함.
- workflow에 명세서와 소스코드 수정할 때의 상황 추가 
- test 수정시의 상황 추가

## Turn 기록

| Turn ID | 요청(Developer) | Claude가 되물은 질문 | 나의 대답 | 결과 |
|---|---|---|---|---|
| P2C-01 | phase2/claude 브랜치를 새로 만들고 그 브랜치에서 작업. 일단 여기까지만 | 0개 | - | `phase2/claude` 브랜치 생성, 실행 전 변경사항 커밋(`4c6ce2c`) |
| P2C-02 | workflow phase2-claude_flow 실행 | 4개 (감면율 형식 / 동명이인 / 결제자 미포함 / 수정 시 잔여 팝업) | 4개 모두 "[No preference]" → 기본값 적용 | src를 모듈형(core/data/ui, 파일당 100줄 이하·한글 주석)으로 재구현, 테스트 스크립트 재작성 후 133건 PASS(`test05.md`, ver1.4). 새 error 없음 |
| P2C-03 | 변경 요청: 감면율 정수만 / 동명이인 (1)(2) / 결제자는 함께한 사람에 포함(아니면 예외처리) / 수정 저장 시 잔여 선택 유지 / 기능별 스크린샷. change·test_change workflow 실행 후 phase2/doc에도 같은 test 적용 | 0개 (기존 질문 답변으로 확정) | 위 4가지 결정 + 스크린샷 요청 | 명세서(PRD·requirements·test.md) 수정 → src 4파일 수정 → 테스트 케이스 추가 후 153건 PASS(`test06.md`, ver1.5), 캡처 17장. 해석 1건(수정 시 잔여 선택 유지) 명세에 기록 |

### P2C-03 약점/변경 메모 (change workflow 2단계)
- 이전 방식의 약점: ① 소수 감면율이 조용히 반올림/잘못 처리될 수 있었음 ② 동명이인 거부는 사용자가 그냥 못 넣는 불편 ③ 결제자가 함께한 사람에 없을 때 계산이 가정 처리됨 ④ 수정할 때마다 같은 팝업을 다시 물음.
- 개선: 각 규칙을 명세서에 먼저 쓰고(requirements 15~18번), 코드와 테스트를 그 규칙에 맞춤.
| P2C-04 | 같은 테스트를 phase0 브랜치 소스에 그대로 적용(script 변경 가능), 결과는 phase2/claude에 저장 | 0개 | - | phase0 소스(`dutch-pay/`)를 건드리지 않고 어댑터 스크립트(`phase0_*.test.js`, `run_phase0.js`)로 테스트. 153건 중 PASS 84 / FAIL 69 (`test07.md`, `error04.md`). 기본 흐름·정산 불변식은 PASS, 감면·잔여·비활성·검증·동명이인 등은 기능 없음 |
