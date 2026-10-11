# docs.md

## Description
- reviewer agent가 사용할 skill이다. 

## 규칙

### 공통 규칙
1.  기본적으로 Korean을 사용하되, 기술적 용어는 English를 허용한다.
2. 기술적 용어는 주석과 함께 중학생도 이해할 수 있는 수준에서 설명한다.
3. 원리및 흐름에 대해서는 그림과 함께 설명한다.


## instruction
- AI가 파악한 Developer의 의도를 또는 필요한 항목에 해당하면 그 규칙을 따른다.

### Turn 보고
0. Developer가 claude code에게 질문했을 때
1. 최대한 간략하게 설명한다.
2. 한번의 Turn에 대한 기록 : `docs\reflection\phase1.md` 에 이전 기록에 이어서 작성한다. (Phase0,phase1,phase2 등은 developer가 지정해 줄 것이다. )
3. markdowntable로 작성한다.(Turn별로 새로운 Table 생성이 아니라, 행을 추가하며 기록한다.)
4. 한 Turn에서 Claude code가 developer에게 되물은 질문과 개수를 기록한다.
5. `docs\token\tokens.md`에 명령 수행시간, 토큰 수에 대한 정확한 지표들을 markdowntable로 작성한다. 
6. Turn별로 ID를 지정하여 Turn들을 구별한다. 
7. 나의 대답을 포함한다.
8. 최대한 깔끔하게 기록한다. 


### test
- `docs\backlog\testlog` 에 test00.md로 아카이빙한다.
- 시도에 따라 test00뒤의 두자리 수는 increment 된다.
- test00.md에 포함범위는 다음과 같다.
    - 테스트 날짜
    - 테스트 이름
    - 테스트 릴리즈버전
    - test 항목에 따른 성공 여부 및 수치 기록
- 릴리즈 버전은 해당 서비스의 버전을 말한다.
- 릴리즈 버전은 직전 테스트 로그 파일의 릴리즈 버전과 동일하다.
- 최초 테스트의 릴리즈 버전은 ver1.1이다. 

### error log
- 오류 발생 혹은 해당 프로그램의 기술적 약점이 존재한다면 `docs\log\error\error.md` 에 기록한다.
- 오류 메시지가 눈에 띌 수 있도록 코드 블록에 적는다. 
- 포함 내용
    - 오류 메시지
    - 오류 시각 날짜
    - 예상되는 원인
    - 예상되는 해결방법 

### backlog
- 해당 프로그램의 서비스적,기술적 개선 지점이 있을 경우, `docs\log\backlog\backlog.md`에 기록한다.
- backlog_{개선사항}.md 파일로 남긴다.  
- 다음 내용을 포함한다.
    - 개선 핵심
    - 개선 시 예상되는 개선점
    - 기록 날짜
    - 기록인

### 명세서
- 프로젝트의 기획 및 API나 기술적 핵심 로직이 변경되었을 때
    - `docs\PRD.md`는 기획적 내용 반영하여 수정
    - `docs\requirements.md`는 기술적 내용 반영하여 수정

### memory
- 개발되어가고 있는 과정 혹은 핵심 기록을 claude code가 기억하기 위한 기록이다.
- claude code가 흐름을 이해할 수 있도록 하는 최소한의 기록을 한다.
- 기록 방식은 claude code의 자유이며, 단 AI는 다음 사항을 고려한다.
    - 토큰을 아끼기 위해 최소한의 텍스트로 기록한다.
    - 기록 시점을 기록한다.
    - 매번 기록할 필요가 없고, AI가 판단했을 때 개발의 흐름에서 중요한 시점 및 기록 시점이라고 판단되면 그 때 기록한다.

### Phase
- 해당 앱을 열고 앱 실행되고 있는 앱 페이지를 화면 캡쳐한다.
- 모든 기능이 수행될 때마다 화면을 캡쳐한다.
- 캡쳐 결과는 다음 위치에 저장한다.
    - `docs\log\web-screenshot\phase{}-xx` ({}는0,2-doc,2-claude중 하나이며, xx는 increment 숫자이다. 최초는 01이다.)