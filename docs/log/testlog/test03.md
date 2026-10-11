# test03

| 항목 | 내용 |
|---|---|
| 테스트 날짜, 시각 | 2026-10-11 22:04 (KST) |
| 테스트 이름 | 명세서·test.md 반영 후 최종 재테스트 (test01 FAIL 17건 완전 해소 확인) |
| 테스트 릴리즈 버전 | ver1.1 |
| 대상 커밋 | `6edfeba` docs(spec) / `96f46ae` docs(claude) |
| 실행 | `node scripts/test/run_tests.js` (workflow: tester -> reviewer -> release-manager) |
| 결과 요약 | **전체 130건 / PASS 130 / FAIL 0** |

## 회차별 추이

| 회차 | PASS | FAIL | 내용 |
|---|---|---|---|
| test01 | 113 | 17 | 가정 처리(전원 감면, 비활성 참여자, 다중 감면)를 FAIL로 판정 |
| test02 | 126 | 4 | 예외처리 수정 후 — 명세 반영 항목만 FAIL |
| test03 | 130 | 0 | 명세서·test.md 반영 후 전부 PASS |

## 확인한 규칙
| 규칙 | 근거 | 결과 |
|---|---|---|
| 감면 대상은 0명 이상 N-1명 이하 (전원 감면 거부, N-1명 허용) | requirements 13 / PRD | PASS (로직 + UI) |
| 여러 명 감면 시 감면 대상이 아닌 사람에게 균등 재분배 | requirements 13 | PASS (oracle 일치) |
| 비활성화는 기존 지출을 바꾸지 않고, 지출 수정에서 함께한 사람을 해제 | requirements 14 / PRD | PASS (로직 + UI) |
| 명세서·test.md에 위 규칙 명시 | 문서 점검 4건 | PASS |

## 미실행 / 한계
- 사파리·엣지, 실제 휴대폰은 미실행.
