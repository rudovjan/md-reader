(function (root) {
  function parseJSONTree(source) {
    JSON.parse(source);
    const tokens = [...source.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:]+/g)];
    let index = 0;
    function parse() {
      const first = tokens[index++];
      const token = first[0];
      const node = { type: token === '{' ? 'object' : token === '[' ? 'array' : token.startsWith('"') ? 'string' : token === 'null' ? 'null' : /^(true|false)$/.test(token) ? 'boolean' : 'number', children: [], start: first.index };
      if (token === '{' || token === '[') {
        const end = token === '{' ? '}' : ']';
        while (tokens[index][0] !== end) {
          let key = String(node.children.length);
          if (token === '{') { key = JSON.parse(tokens[index++][0]); index++; }
          const child = parse(); child.key = key; node.children.push(child);
          if (tokens[index][0] === ',') index++;
        }
        index++;
      }
      const last = tokens[index - 1];
      node.raw = source.slice(first.index, last.index + last[0].length);
      return node;
    }
    return parse();
  }
  if (typeof module !== 'undefined') { module.exports = { parseJSONTree }; return; }
  root.parseJSONTree = parseJSONTree;
  const states = new Map();
  root.mountJSONTree = function (article, source, preview, pre, file) {
    let state = states.get(file);
    if (!state) { state = { open: new Map(), text: false }; states.set(file, state); }
    const toolbar = document.createElement('div'); toolbar.className = 'json-toolbar';
    const tree = document.createElement('div'); tree.className = 'json-tree';
    const info = document.createElement('span'); info.className = 'json-tree-info';
    const button = (label, action) => { const b = document.createElement('button'); b.textContent = label; b.onclick = action; return b; };
    async function copy(button, value) {
      try { await window.reader.copy(value); button.textContent = 'Copied'; }
      catch { button.textContent = 'Copy failed'; }
      setTimeout(() => { if (button.isConnected) button.textContent = button.dataset.label; }, 1000);
    }
    function copyButton(label, value) {
      const b = button(label, () => copy(b, value)); b.dataset.label = label; return b;
    }
    function makeNode(node, path, depth, label, identity) {
      const container = node.type === 'object' || node.type === 'array';
      const item = document.createElement(container ? 'details' : 'div'); item.className = 'json-node';
      const row = document.createElement(container ? 'summary' : 'div'); row.className = 'json-row'; row.title = path;
      if (label !== null) { const key = document.createElement('span'); key.className = 'json-key'; key.textContent = label + ': '; row.append(key); }
      const value = document.createElement('span'); value.className = 'json-value json-' + node.type;
      value.textContent = container ? (node.type === 'object' ? '{ }' : '[ ]') : node.raw;
      row.append(value);
      if (container) { const count = document.createElement('span'); count.className = 'json-count'; count.textContent = `${node.children.length} ${node.type === 'array' ? 'items' : 'keys'}`; row.append(count); }
      const actions = document.createElement('span'); actions.className = 'json-node-actions';
      actions.append(copyButton('Copy value', node.raw), copyButton('Copy path', path));
      actions.onclick = event => { event.stopPropagation(); event.preventDefault(); };
      row.append(actions); item.append(row);
      if (container) {
        let loaded = false;
        const children = document.createElement('div'); children.className = 'json-children'; item.append(children);
        const populate = () => {
          if (loaded) return; loaded = true;
          node.children.forEach((child, i) => children.append(makeNode(child, node.type === 'array' ? `${path}[${i}]` : `${path}[${JSON.stringify(child.key)}]`, depth + 1, node.type === 'array' ? String(i) : JSON.stringify(child.key), identity + '/' + i)));
        };
        item.open = state.open.has(identity) ? state.open.get(identity) : depth < 1;
        if (item.open) populate();
        item.addEventListener('toggle', () => { state.open.set(identity, item.open); if (item.open) populate(); });
        item.expandNode = () => { item.open = true; state.open.set(identity, true); populate(); };
      }
      return item;
    }
    const sources = preview.records ? source.split(/\r?\n/).filter(line => line.trim()) : [source];
    sources.forEach((record, i) => tree.append(makeNode(parseJSONTree(record), preview.records ? `record[${i}]` : '$', 0, preview.records ? `Record ${i + 1}` : null, String(i))));
    const mode = button(state.text ? 'Tree view' : 'Text view', () => { state.text = !state.text; updateMode(); });
    const expand = button('Expand all', () => {
      let count = 0;
      const queue = [...tree.children];
      while (queue.length && count < 3000) {
        const item = queue.shift(); count++;
        if (item.expandNode) { item.expandNode(); queue.push(...item.lastElementChild.children); }
      }
      info.textContent = queue.length ? 'Large document: expand remaining branches individually.' : '';
    });
    const collapse = button('Collapse all', () => { tree.querySelectorAll('details').forEach(item => { item.open = false; }); state.open.forEach((_value, key) => state.open.set(key, false)); info.textContent = ''; });
    function updateMode() { tree.hidden = state.text; pre.hidden = !state.text; mode.textContent = state.text ? 'Tree view' : 'Text view'; expand.hidden = collapse.hidden = state.text; }
    toolbar.append(mode, expand, collapse, copyButton('Copy JSON', source), info);
    article.prepend(toolbar); article.append(tree); updateMode();
  };
})(globalThis);
