# git.md

## Description
- git을 관리한다.

## instruction 

### branch 전략
- 프로젝트 규모가 작기 때문에 main이 develop 디렉토리와 동일한 역할을 한다.
- phase0, phase1, phase2/claude,phase2/doc 브랜치가 있다. 없다면 생성한다.
- phase0은 이제부터 건들지 않는다.

### push
- commit message는 다음과 같은 규격을 지킨다.
<type>(<scope>): <subject>

<body>

<footer>

### tag
- developer가 tag에 대한 요청을 하면 요청에 맞는 이름으로 tag하여 릴리즈한다. 