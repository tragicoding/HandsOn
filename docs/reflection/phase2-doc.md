# phase2-doc : 명세서만 읽고 만든 프로그램 (대조군)

## Description
- `docs/PRD.md`, `docs/requirements.md`(와 PRD가 가리키는 레퍼런스 이미지)만 보고 `src`를 새로 만들었다.
- `.claude/`(agents·skills)와 `CLAUDE.md`를 활용해 만든 phase2-claude와 비교하기 위한 **대조군**이다.
- workflow(`.claude/workflow/phase2-doc.md`)가 허용한 3가지(tester 테스트, reviewer 문서화, release-manager push·tag)만 `.claude`를 참고했다.

## 결과 요약
- 구현: 참여자(비활성화) / 지출(전체 선택, 감면 %, 잔여 팝업) / 정산·송금 / 텍스트 복사 / localStorage
- 테스트: 108건 중 108 PASS (`docs/log/testlog/test00.md`)
- 화면 캡처: `docs/log/web-screenshot/phase2-doc-01~09.png`

## Turn

| Turn ID | 시각(KST) | Developer 질문 | 수행 내용 | 되물은 질문 | 나의 대답 |
|---|---|---|---|---|---|
| P2D-01 | 2026-10-11 | "phase2-doc을 workflow에 따라 실행. phase2/doc 브랜치가 없으면 만들어 거기서 시작" | phase2/doc 브랜치 생성 -> src 삭제 -> 명세서 기반으로 새 src 구현 -> 로직 87건·UI 21건 테스트 PASS -> 문서화 | 0개 | 명세서에 없는 부분(전원 감면, 비활성 참여자의 기존 지출, 다중 감면)은 가정으로 처리하고 `docs/log/error/error.md`에 기록했다. |
| P2D-02 | 2026-10-11 | "가정 처리를 실패로 기록, 스크립트 재작성, 예외처리 수정, 명세서·test.md 반영, 작업마다 commit" | test skill 개정 -> 스크립트 재작성 -> test01(FAIL 17) 기록 -> implementer 예외처리 -> test02(FAIL 4) -> 명세 반영 -> test03(130/130 PASS) | 0개 | 비활성 규칙은 "수정 화면에서 비활성 참여자도 보이게 하고 직접 해제"로 해석해 구현했다. 다른 의도면 알려달라. |
