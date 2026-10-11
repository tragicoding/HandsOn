// phase0 브랜치 소스(dutch-pay)를 같은 테스트로 검사하는 실행기
// 실행: node scripts/test/run_phase0.js [phase0 소스 폴더]
//  - 폴더를 주지 않으면 git의 origin/phase0 브랜치에서 dutch-pay를 임시 폴더로 꺼내 쓴다. (작업 폴더는 건드리지 않음)
//  1) phase0_logic.test.js : 정산 로직·예외·명세 반영 (phase2-claude와 같은 케이스, phase0 어댑터 사용)
//  2) phase0_ui.test.js    : 브라우저 UI (phase2-claude와 같은 케이스, 임시 폴더에 캡처)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

let src = process.argv[2];
if (!src) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase0-'));
  const repo = path.resolve(__dirname, '..', '..');
  for (const f of ['app.js', 'index.html', 'settle.js', 'style.css']) {
    const r = spawnSync('git', ['show', `${process.env.PHASE0_REF || 'origin/phase0'}:dutch-pay/${f}`], { cwd: repo, encoding: 'utf8', maxBuffer: 1 << 24 });
    if (r.status !== 0) { console.error('phase0 소스를 git에서 꺼내지 못했습니다(미실행):', r.stderr); process.exit(2); }
    fs.writeFileSync(path.join(tmp, f), r.stdout);
  }
  src = tmp;
}
const env = Object.assign({}, process.env, { PHASE0_SRC: path.resolve(src) });
const jobs = [
  { name: '정산 로직·예외·명세 반영', file: 'phase0_logic.test.js' },
  { name: '앱 기능(브라우저 UI)', file: 'phase0_ui.test.js' },
];
const summary = [];
for (const j of jobs) {
  console.log(`\n########## ${j.name} (${j.file})`);
  const r = spawnSync(process.execPath, [path.join(__dirname, j.file)], { stdio: 'inherit', env });
  summary.push({ ...j, code: r.status });
}
console.log('\n########## 요약 (phase0)');
for (const s of summary) console.log(`- ${s.name}: ${s.code === 0 ? 'PASS' : s.code === 2 ? '미실행' : 'FAIL'}`);
process.exit(summary.some((s) => s.code !== 0) ? 1 : 0);
