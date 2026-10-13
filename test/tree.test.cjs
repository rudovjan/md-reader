const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseJSONTree } = require('../json-tree.js');
test('tree preserves exact tokens, duplicate keys, and unsafe-looking strings', () => {
  const tree = parseJSONTree('{"a":9007199254740993,"a":[null,true,"<script>",{}],"__proto__":1}');
  assert.equal(tree.children.length, 3);
  assert.equal(tree.children[0].raw, '9007199254740993');
  assert.equal(tree.children[1].children[2].raw, '"<script>"');
  assert.equal(tree.children[2].key, '__proto__');
  assert.equal(tree.children[1].type, 'array');
});
test('tree accepts primitives and rejects malformed input', () => {
  assert.equal(parseJSONTree('false').type, 'boolean');
  assert.equal(parseJSONTree('"escaped\\\"key"').type, 'string');
  assert.throws(() => parseJSONTree('{oops}'));
});
