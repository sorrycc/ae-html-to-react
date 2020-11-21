#!/usr/bin/env node

const yParser = require('yargs-parser');

const args = yParser(process.argv.slice(2), {
  alias: {
    version: ['v'],
    help: ['h'],
  },
  boolean: ['version'],
});

if (args.version) {
  console.log(require('./package.json').version);
  process.exit(0);
}

const cwd = process.cwd();
require('./dist')
  .default({
    file: args.file,
    target: args.target,
    appId: args.appId,
    masterKey: args.masterKey,
  })
  .then(() => {
    console.log('Success!');
  })
  .catch((e) => {
    console.error(`Failure!`);
    console.error(e);
  });
