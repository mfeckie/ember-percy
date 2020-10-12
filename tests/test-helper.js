import Application from 'dummy/app';
import config from 'dummy/config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import QUnit from 'qunit';

QUnit.extend(QUnit.assert, {
  matches(actual, regex, message) {
    var result = !!regex && !!actual && (new RegExp(regex)).test(actual);
    var expected = `String matching ${regex.toString()}`;
    this.pushResult({ result, actual, expected, message });
  }
});

setApplication(Application.create(config.APP));

start({ setupEmberOnerrorValidation: false });
