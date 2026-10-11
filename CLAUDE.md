# Dutch-Pay

# Agent Instructions

- 이 CLAUDE.md는 Claude code Agent가 어떻게 행동해야 하는가에 대한 규칙을 명시한 것이고, 반드시 이 규칙을 따라야 한다.
- 만약 Developer가 해당 파일을 무시하라고 하면 절대 읽지 않는다.
    - 이 경우, .claude/도 읽지 않는다. 
    - 단, devleoper의 예외요청에 따라 ./claude의 특정 업무를 수행하라고 지시한다면, 그 특정 업무만을 수행한다. 

## 용어
- "developer"는 claude code에게 명령하는 프롬프트 입력자 즉, 개발자를 뜻한다.
- "End User"는 해당 프로젝트 서비를 이용하는 사용자를 뜻한다.
- agent는 claude code가 어떤 업무를 수행할 때 실행의 주체가 되는 일종의 '부서 직원' 이다.
- skills는 agent(부서직원)이 업무를 수행할 때 따라야할 규칙이나 기술범위 및 기술을 의미한다. 
- workflow는 여러 agent들(회사의 여러 직원)이 특정 순서 규칙에 따라 협업하는 흐름을 말한다. 

## 핵심 규칙
- docs\PRD.md , docs\requirements.md 의 문서를 반드시 가장 먼저 읽고 프로젝트를 파악한다.
- developer의 요청을 분석하여 해당하는 agent를 선택한다.
    - .claude\agents
- developer가 특정 workflow 수행을 원한다면, 다음 경로의 파일을 참고하여 수행한다.
    - .claude\workflow\workflow.md
- workflow에 대한 요청이 있을 때는 해당 workflow의 순서가 절대적 원칙이 된다.
- agent들은 agent간의 호출관계를 대략적으로 가질 수 있다. 
- agent 혹은 skills의 이름 및 역할은 해당 파일의 이름과 동일하다. 
- test를 제외한 모든 경로는 HandsOn root 디렉토리로 부터의 상대경로이다.
- Developer의 질문/요청은 항상 reviewer agent의 ###Turn을 수행한다. (여기서 질문/요청은 claude에게 보내는 모든 프롬프트를 포함한다.)
- 명세서를 읽은 뒤 애매한 구현사항은 Developer에게 물어본다.