# error05: GitHub Pages 404 (해결됨)

- 확인·해결 날짜: 2026-10-12 (KST)
- 대상: https://tragicoding.github.io/HandsOn/

## 오류

```text
HTTP 404
Site not found · GitHub Pages
```

## 원인

원격 main에는 루트 index.html과 src/index.html이 있었지만 GitHub Pages가 활성화되지 않았다. 저장소 관리 권한으로 Pages API를 조회해도 404였고, 배포 실행 기록도 없었다.

## 해결

GitHub Pages 배포 소스를 main 브랜치의 /(root)로 설정하고 HTTPS를 사용했다. GitHub의 `pages build and deployment`가 성공했다.

- 최초 배포 커밋: ec56658f86f5a6c06a537f708c3d1422a5226118
- 배포 실행: https://github.com/tragicoding/HandsOn/actions/runs/38239103503
- 최종 앱 주소: https://tragicoding.github.io/HandsOn/src/index.html
- 이 오류는 배포 설정으로 해결했으며 앱 소스 변경은 필요하지 않았다.

## 확인 결과

설치된 Edge를 Playwright로 실행하여 공개 배포 주소에서 확인했다.

| 확인 항목 | 결과 |
|---|---|
| 루트 주소 HTTP 응답과 앱 이동 | 200, src/index.html로 이동 |
| 참여자·지출 내역·정산 결과 화면 | 표시됨 |
| 2명, 60,000원 지출 | 1인 부담 30,000원, 송금 30,000원 |
| 새로고침 후 입력 내용 | 유지됨 |
| JavaScript 오류 | 0건 |
| 실패한 HTTP 리소스 요청 | 0건 |

위 확인은 배포 복구와 기본 동작 점검이며 전체 회귀 테스트 결과를 대체하지 않는다. 기존 test00~test08 기록은 수정하지 않았다.

## 발표자료 반영

원본을 보존하고 `docs/Dutch-Pay_김진서_발표자료_수정본.pptx`와 같은 이름의 PDF를 작성했다. 4페이지는 UI·UX 유지 판단으로 정정하고, 5페이지는 임의 가정을 PASS로 처리했던 사례와 수정된 판정 기준을 명시했다. 3·6·7페이지와 연결된 프롬프트 부록도 요청에 맞게 수정하고, 배포 확인 후 마지막 페이지의 404 안내를 삭제했다.
