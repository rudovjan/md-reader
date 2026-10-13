const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatJSON } = require('../json-format.js');
const { isSupported } = require('../reader.cjs');
test('opens JSON and retains Markdown support', () => {
  assert.ok(isSupported('/tmp/My data.JSON')); assert.ok(isSupported('readme.md'));
  assert.equal(isSupported('data.json.exe'), false); assert.equal(isSupported(null), false);
});
test('formats nested JSON without changing values or large numeric tokens', () => {
  const source = '{"big":9007199254740993,"n":1e+40,"nested":[{},[],true,null,"a\\\"b,:[x]"]}';
  const result = formatJSON(source);
  assert.ok(result.includes('9007199254740993')); assert.ok(result.includes('1e+40'));
  assert.deepEqual(JSON.parse(result), JSON.parse(source)); assert.ok(result.includes('\n  "big":'));
});
test('handles primitives and rejects invalid JSON', () => {
  for (const value of ['null','true','123','"hello"','[]','{}']) assert.equal(formatJSON(value), value);
  for (const value of ['', '{"a":}', '[1,]', '{oops}']) assert.throws(() => formatJSON(value));
});
