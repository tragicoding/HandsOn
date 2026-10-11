# workflow.md

## Description
- Developer의 특정 workflow 업무 요청이 들어왔을 때 아래 순서에 따라 행동한다.
- Developer가 phase2-doc에 대한 실행을 원할 때 수행한다.
- claude ax 설계가 없을 때와 있을 때를 비교하기 위한 비교군이다.


## 규칙
- xxx agent는 `.claude\agents\` 의 xxx.md 에 해당하는 agent를 의미한다.
- .claude/와 CLAUDE.md를 완전히 무시하고, 오직 다음 두 파일만을 참고하여 실행한다.
    - `docs\PRD.md`
    - `docs\requirements.md`
- 단, 아래 workflow에서 허용하는 것은 반드시 실행한다. 

### workflow
0. `src` 디렉토리를 삭제한다.
1. `docs\PRD.md`,`docs\requirements.md`를 읽는다.
2. 새로운 `src` 아래에에서 소스코드를 만든다.
3. CLAUDE.md, ./claude 모두 무시하지만, 프로그램 코드 작성 뒤에는 다음 사항은 반드시 실행한다.
    (1) `.claude\agents\tester.md` 의 test를실시한다.
    (2) `.claude\agents\reviewer.md`의 문서화는 반드시 실시한다.
        - ###phase도 실시한다.
    (3) `.claude\agents\release-manager.md` 에 따라 push와 tag를 한다.
    - phase2/doc 브랜치에 push한다.(없다면 생성한다.)
    - phase2-doc이라는 tag를 건다.
    - tag의 description에는 "명세서만을 읽고 만든 프로그램"임을 명확히 적고, "claude ax 스킬들을 활용하여 만든 경우와 비교하기 위한 대조군" 임을 설명한다. 