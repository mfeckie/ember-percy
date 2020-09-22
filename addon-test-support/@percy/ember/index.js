import serializeDOM from '@percy/dom'

// Collect client and environment information
import { VERSION as sdkVersion } from '@percy/ember/version';
import { VERSION as emberVersion } from '@ember/version';

const CLIENT_INFO = `@percy/ember/${sdkVersion}`;
const ENV_INFO = [`ember/${emberVersion}`];

if (window.QUnit) ENV_INFO.push(`qunit/${window.QUnit.version}`);
if (window.mocha) ENV_INFO.push(`mocha/${window.mocha.version}`);

// Maybe get the CLI API address from the environment
import { PERCY_CLI_API } from '@percy/ember/cli-env';

// Capture fetch before it's mutated by Pretender
const { fetch } = window;

// Check if Percy is enabled using the healthcheck endpoint
export async function isPercyEnabled() {
  if (isPercyEnabled.result == null) {
    try {
      let response = await fetch(`${PERCY_CLI_API}/healthcheck`);
      isPercyEnabled.result = response.ok;
    } catch (err) {
      isPercyEnabled.result = false;
    }

    if (isPercyEnabled.result === false) {
      console.log('[percy] Percy is not running, disabling snapshots');
    }
  }

  return isPercyEnabled.result;
}

// Helper to generate a snapshot name from the test suite
function generateName(assertOrTestOrName) {
  if (assertOrTestOrName.test?.module?.name && assertOrTestOrName.test?.testName) {
    // generate name from qunit assert object
    return `${assertOrTestOrName.test.module.name} | ${assertOrTestOrName.test.testName}`;
  } else if (assertOrTestOrName.fullTitle) {
    // generate name from mocha test object
    return assertOrTestOrName.fullTitle();
  } else {
    // fallback to string
    return assertOrTestOrName.toString();
  }
}

// Helper to scope a DOM snapshot to the ember-testing container
function scopeDOM(dom, { scope, domTransformation }) {
  if (domTransformation) domTransformation(dom);
  // we only want to capture the ember application, not the testing UI
  let $scoped = dom.querySelector(scope || '#ember-testing');
  let $body = dom.querySelector('body');
  if (!$scoped) return;

  // replace body content with scoped content
  $body.innerHTML = $scoped.innerHTML;

  // copy scoped attributes to the body element
  for (let i = 0; i < $scoped.attributes.length; i++) {
    let { name, value } = $scoped.attributes.item(i);
    // keep any existing body class
    if (name === 'class') value = `${$body.className} ${value}`.trim();
    $body.setAttribute(name, value);
  }

  // remove ember-testing styles by removing the id
  dom.querySelector('#ember-testing').removeAttribute('id');
}

export default async function percySnapshot(name, options = {}) {
  if (!(await isPercyEnabled())) return;
  name = generateName(name);

  try {
    // Serialize and capture the DOM
    let domSnapshot = serializeDOM({
      enableJavaScript: options.enableJavaScript,
      domTransformation: dom => scopeDOM(dom, options)
    });

    // Post the DOM to the snapshot endpoint with snapshot options and other info
    let response = await fetch(`${PERCY_CLI_API}/snapshot`, {
      method: 'POST',
      body: JSON.stringify({
        ...options,
        environmentInfo: ENV_INFO,
        clientInfo: CLIENT_INFO,
        url: document.URL,
        domSnapshot,
        name
      })
    });

    // Handle errors
    let { success, error } = await response.json();
    if (!success) throw new Error(error);
  } catch (err) {
    console.error(`[percy] Could not take DOM snapshot "${name}"`);
    console.error(`[percy] ${err.stack}`);
  }
}
