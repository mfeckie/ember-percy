'use strict';

const createTestServer = require('@percy/core/test/helpers/server');

// use a mock server to control a mock server
module.exports = function(app) {
  let percyServer;

  // start mock percy server
  app.get('/mock/start', async (req, res) => {
    percyServer = await createTestServer({
      default: () => [200, 'application/json', { success: true }]
    }, 5338);

    res.end();
  });

  // stop mock percy server
  app.get('/mock/stop', async (req, res) => {
    await percyServer.close();
    res.end();
  });

  // returns requests made to the mock percy server
  app.get('/mock/requests', (req, res) => {
    res.json(percyServer.requests);
  });

  // mocks a healthcheck failure
  app.get('/mock/healthcheck/fail', (req, res) => {
    percyServer.reply('/percy/healthcheck', () => Promise.reject(new Error()));
    res.end();
  });

  // mocks a healthcheck error
  app.get('/mock/healthcheck/error', (req, res) => {
    percyServer.reply('/percy/healthcheck', r => r.connection.destroy());
    res.end();
  });

  // mocks a snapshot error
  app.get('/mock/snapshot/error', (req, res) => {
    percyServer.reply('/percy/snapshot', () => (
      [400, 'application/json', { success: false, error: 'testing' }]
    ));

    res.end();
  });
};
