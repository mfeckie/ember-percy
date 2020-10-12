import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import percySnapshot, { isPercyEnabled } from '@percy/ember';

function stub(obj, method) {
  let fn = (...args) => fn.calls.push(args);
  fn.restore = () => obj[method] = fn.og;
  fn.og = obj[method];
  fn.calls = [];

  obj[method] = fn;
}

module('percySnapshot', hooks => {
  const requests = () => fetch('/mock/requests')
    .then(r => r.ok ? r.json() : r.text());

  setupApplicationTest(hooks);

  hooks.beforeEach(async () => {
    // mock mocha env info
    window.mocha = { version: '1.2.3' };

    // we cannot mock percySnapshot with pretender so we have to use a mock node server that is
    // controlled via an http-mock, `/mock/*`
    await fetch('/mock/start');

    // stub console logging
    stub(console, 'log');
    stub(console, 'error');

    // clear cached result for testing
    delete isPercyEnabled.result;
  });

  hooks.afterEach(async () => {
    console.log.restore();
    console.error.restore();
    await fetch('/mock/stop');
  });

  test('disables snapshots when the healthcheck fails', async assert => {
    await fetch('/mock/healthcheck/fail');

    await percySnapshot('Snapshot 1');
    await percySnapshot('Snapshot 2');

    assert.deepEqual(await requests(), [
      ['/percy/healthcheck']
    ]);

    assert.deepEqual(console.error.calls, []);
    assert.deepEqual(console.log.calls, [
      ['[percy] Percy is not running, disabling snapshots']
    ]);
  });

  test('disables snapshots when the healthcheck encounters an error', async assert => {
    await fetch('/mock/healthcheck/error');

    await percySnapshot('Snapshot 1');
    await percySnapshot('Snapshot 2');

    assert.deepEqual(await requests(), [
      ['/percy/healthcheck']
    ]);

    assert.deepEqual(console.error.calls, []);
    assert.deepEqual(console.log.calls, [
      ['[percy] Percy is not running, disabling snapshots']
    ]);
  });

  test('posts snapshots to the local percy server', async assert => {
    await percySnapshot('Snapshot 1');
    await percySnapshot('Snapshot 2');

    let reqs = await requests();

    assert.equal(reqs[0][0], '/percy/healthcheck');
    assert.equal(reqs[1][0], '/percy/snapshot');
    assert.equal(reqs[2][0], '/percy/snapshot');

    assert.equal(reqs[1][1].name, 'Snapshot 1');
    assert.matches(reqs[1][1].url, /^http:\/\/localhost:7357/);
    assert.matches(reqs[1][1].domSnapshot, /<body class="ember-application"><\/body>/);
    assert.matches(reqs[1][1].clientInfo, /@percy\/ember\/.+/);
    assert.matches(reqs[1][1].environmentInfo[0], /ember\/.+/);
    assert.matches(reqs[1][1].environmentInfo[1], /qunit\/.+/);

    assert.equal(reqs[2][1].name, 'Snapshot 2');
  });

  test('generates a snapshot name from qunit assert', async assert => {
    await percySnapshot(assert);
    assert.equal((await requests())[1][1].name, (
      'percySnapshot | generates a snapshot name from qunit assert'));
  });

  test('generates a snapshot name from mocha\'s test', async assert => {
    // mocked since this is not a mocha test
    await percySnapshot({ fullTitle: () => 'Mocha | generated name' });
    assert.equal((await requests())[1][1].name, 'Mocha | generated name');
  });

  test('copies scoped attributes to the body element', async assert => {
    let $scope = document.querySelector('#ember-testing');
    $scope.classList.add('custom-classname');
    $scope.setAttribute('data-test', 'true');

    await percySnapshot('Snapshot 1');

    assert.matches((await requests())[1][1].domSnapshot, (
      /<body class="ember-application custom-classname" data-test="true"><\/body>/));
  });

  test('handles snapshot errors', async assert => {
    fetch('/mock/snapshot/error');

    await percySnapshot('Snapshot 1');

    assert.deepEqual(console.log.calls, []);
    assert.deepEqual(console.error.calls[0][0], '[percy] Could not take DOM snapshot "Snapshot 1"')
    assert.matches(console.error.calls[1][0], /^\[percy] Error: testing\n/);
  });
});
