'use strict';

const { createAppServer } = require('./app');

createAppServer()
  .then(({ server, port, config }) => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`AI proxy listening on 0.0.0.0:${port}`);
      console.log(`Home page available at http://localhost:${port}/`);
      console.log(`Active provider: ${config.providerLabel}`);
      console.log(`Forwarding requests to ${config.baseUrl}`);
    });
  })
  .catch((error) => {
    console.error(`Failed to start AI proxy: ${error.message}`);
    process.exitCode = 1;
  });
