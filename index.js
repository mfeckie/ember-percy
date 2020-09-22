'use strict';

const WriteFile = require('broccoli-file-creator');
const MergeTrees = require('broccoli-merge-trees');
const BroccoliDebug = require('broccoli-debug');
const debugTree = BroccoliDebug.buildDebugCallback('@percy/ember');
const pkg = require('./package');

// Maybe get the CLI API address from the environment
const { PERCY_CLI_API = 'http://localhost:5338/percy' } = process.env;

module.exports = {
  name: pkg.name,

  included() {
    this._super.included.apply(this, arguments);
    this.import('node_modules/@percy/dom/dist/index.js', {
      using: [{ transformation: 'amd', as: '@percy/dom' }],
      type: 'test'
    });
  },

  treeForAddonTestSupport(tree) {
    let version = new WriteFile('@percy/ember/version.js', (
      `export const VERSION = "${pkg.version}";\n`
    ));

    let env = new WriteFile('@percy/ember/cli-env.js', (
      `export const PERCY_CLI_API = "${PERCY_CLI_API}";\n`
    ));

    let input = debugTree(new MergeTrees([tree, version, env]), 'addon-test-support:input');
    let output = this.preprocessJs(input, '/', this.name, { registry: this.registry });
    return debugTree(output, 'addon-test-support:output');
  }
};
