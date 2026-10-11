# workflow.md

## Description
- Developer의 특정 workflow 업무 요청이 들어왔을 때 아래 순서에 따라 행동한다.
- test 자체를 수정해야 하는 경우

## 규칙
- xxx agent는 `.claude\agents\` 의 xxx.md 에 해당하는 agent를 의미한다.

### workflow
1. test.md에 developer가 요청한 test 요청사항에 대해 수정하여 반영
2. implementer agent 실행
- `scripts` 수정 및 `src` 필요시 수정
3. 이로 인해 명세서가 바뀌어야 한다면, reviewer agent 실행 호출.
- 이때, 명세서 뿐만 아니라 다른 문서들도 수정되어야 한다면 수정할것. 
4. tester agent 실행
    -   `.claude\agents\tester.md`
    - reviewer agent를 호출한다.
5. reviewer agent 실행
    - `.claude\agents\reviewer.md`
6. release-manager agent 실행
    - `.claude\agents\release-manager.md`

