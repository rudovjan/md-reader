const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isMarkdown } = require('../reader.cjs');
test('accepts Markdown paths, including spaces and uppercase extensions', () => {
  for (const file of ['/tmp/My notes.md', '/tmp/README.MD', '/tmp/a.markdown', '/tmp/a.mdown', '/tmp/a.mkd']) assert.ok(isMarkdown(file));
});
test('rejects other files and invalid input', () => {
  for (const file of [null, undefined, 1, '/tmp/file.html', '/tmp/file.md.exe', '--smoke-test']) assert.equal(isMarkdown(file), false);
});
