'use strict';

const path = require('path');

module.exports = {
  name: require('./package').name,

  testemMiddleware(app) {
    require(path.join(this.project.root, 'tests/dummy/server'))(app);
  }
};
