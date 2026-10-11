// Dutch-Pay 전체 테스트 실행기 (tester agent / .claude/skills/test.md 기준)
// 실행: node scripts/test/run_tests.js
//  1) 정산 로직·예외·명세 반영 테스트  : phase2_doc_logic.test.js  (Node만 필요)
//  2) 앱(브라우저) 기능 테스트        : phase2_doc_ui.test.js     (playwright + chromium 필요, 없으면 "미실행")
// 현재 src(settle.js, validate.js, app.js)에 맞춘 스크립트이며, src 구조가 바뀌면 이 폴더의 스크립트도 함께 수정한다.
const path = require('path');
const { spawnSync } = require('child_process');

const jobs = [
  { name: '정산 로직·예외·명세 반영', file: 'phase2_doc_logic.test.js' },
  { name: '앱 기능(브라우저 UI)', file: 'phase2_doc_ui.test.js' },
];
const summary = [];
for (const j of jobs) {
  console.log(`\n########## ${j.name} (${j.file})`);
  const r = spawnSync(process.execPath, [path.join(__dirname, j.file)], { stdio: 'inherit', env: process.env });
  summary.push({ ...j, code: r.status });
}
console.log('\n########## 요약');
let failed = false;
for (const s of summary) {
  const label = s.code === 0 ? 'PASS' : s.code === 2 ? '미실행' : 'FAIL';
  if (s.code !== 0) failed = true;
  console.log(`- ${s.name}: ${label}`);
}
process.exit(failed ? 1 : 0);
