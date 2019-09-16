const { toMatchFile } = require('jest-file-snapshot');

expect.extend({ toMatchFile });

// eslint-disable-next-line no-underscore-dangle
global.__DEV__ = true;
