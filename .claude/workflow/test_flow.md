# workflow.md

## Description
- Developer의 특정 workflow 업무 요청이 들어왔을 때 아래 순서에 따라 행동한다.
- Developer가 현재 소스로 test를 실행하고 싶을 때 수행한다. 

## 규칙
- xxx agent는 `.claude\agents\` 의 xxx.md 에 해당하는 agent를 의미한다.

### workflow
1. tester agent 실행
    -   `.claude\agents\tester.md`
    - reviewer agent를 호출한다.
2. reviewer agent 실행
    - `.claude\agents\reviewer.md`
3. release-manager agent 실행
    - `.claude\agents\release-manager.md`

