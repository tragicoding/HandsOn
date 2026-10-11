# phase1 : 클로드 문서 작성

## Description
- CLAUDE.md를 작성하여 클로드코드의 절대 규칙이나 공통 규칙을 정한다.
- docs에 PRD, Requirements를 작성하여 프로젝트의 기획 문서화
- .claude/agents를 통해 claude code가 어떤 일을 수행할지 지정
- .claude/skills를 통해 agent가 특정 업무를 수행할 때 따라야할 규칙을 명시.

## Architecture
- 계층별 책임 분리 및 추상화
- 하나의 회사의 직원들이 각자 혹은 공통의 규칙

## 중요했던 부분
- workflow에 따라 agent의 실행 순서를 명시했는데, 각 agent의 수행 규칙에서 다른 agent를 호출하는 규칙과 충돌이 있었다. 

## Turn

