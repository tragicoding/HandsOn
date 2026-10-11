# workflow.md

## Description
- Developer의 특정 workflow 업무 요청이 들어왔을 때 아래 순서에 따라 행동한다.
- 최초로 프로그램을 만드는 명령 실행시 수행한다. 

## 규칙
- xxx agent는 `.claude\agents\` 의 xxx.md 에 해당하는 agent를 의미한다.

### workflow
0. `src` 디렉토리를 삭제한다.
1. implementer agent 실행
    - `.claude\agents\implementer.md`
2. tester agent 실행
    - `.claude\agents\tester.md`
3. reviewer agent 실행
    - `.claude\agents\reviewer.md`
    - 이는 tester agent에 의해 호출된 것이다.
        - test 릴리즈 버전 up
    - 만약 error 발생에 의한 reviewer라면, reviewer의 업무가 끝난 이후에 위의 1,2번을 반복 실행한다.
4. memory agent 실행
    - `.claude\agents\memory.md`
    - 위의 3번까지 완전히 끝났을 경우 실행한다.
5. release-manager agent 실행
    - `.claude\agents\release-manager.md`
    - 위의 4번 과정까지 끝났을 경우에만 실행한다. 