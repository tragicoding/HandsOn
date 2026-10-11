# Dutch-Pay

모임에서 생기는 복잡한 변수(택시, 술 안 마신 사람, 운전자 감면, 번갈아 결제)를 반영해 정산하고, **누가 누구에게 얼마를 보낼지**까지 자동으로 계산해 주는 더치페이 웹앱입니다. 로그인과 서버 없이 브라우저에서만 동작합니다.

## 데모

| 이름 | 저장소 | GitHub Pages 데모 | 한 줄 설명 |
|---|---|---|---|
| 김진서 | [tragicoding/HandsOn](https://github.com/tragicoding/HandsOn) | [tragicoding.github.io/HandsOn](https://tragicoding.github.io/HandsOn/) | 감면·잔여 금액·차등 부담까지 반영해 송금 횟수를 최소로 줄여 주는 모임 정산 웹앱 |

## 주요 기능

- **참여자 관리**: 이름을 추가하고, 노드를 눌러 활성/비활성을 전환합니다. 동명이인은 `(1)`, `(2)`로 구분합니다.
- **지출 입력**: 항목, 금액, 결제자, 함께한 사람을 입력하고 수정·삭제할 수 있습니다. 결제자는 반드시 함께한 사람에 포함됩니다.
- **감면율**: 특정 참여자에게 0~100% 정수 감면을 적용하고, 감면액은 나머지 사람이 균등하게 나눠 냅니다. (전원 감면은 불가)
- **잔여 금액 처리**: 나누어떨어지지 않으면 "결제자가 부담" 또는 "랜덤 배분"을 고를 수 있습니다.
- **정산 결과**: 사람별 낸 돈, 쓴 돈, 차액을 계산하고 송금을 상계해 송금 횟수를 줄입니다. (최대 인원 − 1번)
- **결과 복사**: 정산 결과를 텍스트로 복사해 단톡방에 붙여넣을 수 있습니다.
- **저장**: 입력한 내용은 브라우저 `localStorage`에 저장되어 새로고침해도 유지됩니다.

## 실행 방법

설치할 것은 없습니다. 저장소를 받은 뒤 `index.html`(또는 `src/index.html`)을 브라우저로 열면 됩니다.

```bash
git clone https://github.com/tragicoding/HandsOn.git
cd HandsOn
# index.html 을 브라우저로 열기
```

### 테스트

로직은 Node, 화면은 Playwright(Chromium)로 검증합니다.

```bash
npm install playwright
node scripts/test/run_tests.js
```

## 프로젝트 구조

```
.
├── index.html            # GitHub Pages 진입점 (src/index.html로 이동)
├── src/
│   ├── index.html
│   ├── css/              # base, form, modal, result
│   └── js/
│       ├── app.js
│       ├── core/         # 계산 (settle, transfer, money, random, validate, share)
│       ├── data/         # 저장 (store)
│       └── ui/           # 화면 (copy 등)
├── scripts/test/         # 로직·UI 테스트
├── docs/                 # PRD, requirements, 로그, 회고
└── .claude/              # agents, skills, workflow
```

## 문서

- [PRD](docs/PRD.md): 왜, 누구를 위해, 어디까지 만드는지
- [요구사항](docs/requirements.md): 기능·비기능 요구사항과 계산 규칙
- [테스트 로그](docs/log/testlog): 회차별 테스트 결과
- [회고](docs/reflection): phase별 관찰과 한계

## Phase별 개발 비교

같은 앱을 만드는 방식을 세 가지로 달리해 비교했습니다. 같은 테스트와 같은 판정 기준(명세에 없는 동작은 가정이 아니라 FAIL)을 적용했습니다.

| 브랜치 | 방식 | 테스트 결과 |
|---|---|---|
| `phase0` | 프롬프트 한 줄로 만든 나이브 베이스라인 | 84 PASS / 69 FAIL (153건) |
| `phase2/doc` | PRD·requirements만 참고해 구현 | 137 PASS / 10 FAIL (147건) |
| `phase2/claude` | PRD·requirements + `.claude`(agents, skills, workflow) | 153 PASS / 0 FAIL (153건) |

> `phase2/doc`은 동명이인 로직을 별도 함수로 시험할 수 없어 UI에서만 확인하므로 총 건수가 다릅니다.
