// 테스트용 로더: src/js/core/*.js(브라우저용 전역 네임스페이스 방식)를 Node에서 불러와
// 하나로 합쳐진 DutchPay 네임스페이스를 돌려준다. 사용: const { S, V } = require('./loadCore.js')
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const CORE = path.resolve(__dirname, '..', '..', 'src', 'js', 'core');
// index.html의 로드 순서와 같아야 한다.
const ORDER = ['money', 'random', 'validate', 'share', 'transfer', 'settle'];

const sandbox = {};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const name of ORDER) {
  const file = path.join(CORE, name + '.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}
const ns = sandbox.DutchPay;
module.exports = { S: ns, V: ns, ns };
