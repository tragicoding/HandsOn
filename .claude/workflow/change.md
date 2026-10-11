# workflow.md

## Description
- Developer의 특정 workflow 업무 요청이 들어왔을 때 아래 순서에 따라 행동한다.
- 수정할 때 사용하는 workflow이다. 

## 규칙
- xxx agent는 `.claude\agents\` 의 xxx.md 에 해당하는 agent를 의미한다.

### workflow
1. developer의 의도를 파악하여 `docs\log\error`을 포함한 필요시 다른 문서들과 비교하여 현재 수정할 부분이 무엇인지 명확히한다.

2. reviewer agent 실행
    - `.claude\agents\reviewer.md`
    - 명세서 를 수정한다.
    - 이러한 약점에 대해서 phase에 내용 추가한다. 
3. implementer agent 실행(2번에서 수정한 명세서에 따라)
    - `.claude\agents\implementer.md`
4. tester agent 실행
    - `.claude\agents\tester.md`
5. reviewer agent 실행
6. release-manager agent 실행
    - `.claude\agents\release-manager.md`

