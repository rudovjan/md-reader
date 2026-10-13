const $ = selector => document.querySelector(selector);
let currentFile = null;
let base = null;
let editing = false;
let baseline = '';
let documentData = null;
function updateDirty() {
  const dirty = $('#editor').value !== baseline;
  $('#save').disabled = !dirty;
  $('#filename').textContent = `${documentData.name}${dirty ? ' •' : ''}`;
  $('#reading').textContent = dirty ? 'UNSAVED CHANGES' : 'ALL CHANGES SAVED';
}
function toggleEdit() {
  if (!documentData) return;
  editing = !editing;
  renderDocument({ ...documentData, source: $('#editor').value });
  $('#source-pane').hidden = !editing;
  document.body.classList.toggle('editing', editing);
  $('#edit').textContent = editing ? 'Read' : 'Edit';
  $('#edit').setAttribute('aria-pressed', String(editing));
  if (editing) $('#editor').focus();
  updateDirty();
}
$('#edit').onclick = toggleEdit;
$('#save').onclick = () => window.reader.save();
$('#editor').oninput = () => {
  window.reader.draft($('#editor').value);
  renderDocument({ ...documentData, source: $('#editor').value });
  updateDirty();
};
window.reader.onToggleEdit(toggleEdit);
window.reader.onSaved(source => { baseline = source; updateDirty(); });
$('#open').onclick = $('#empty-open').onclick = () => window.reader.open();
const theme = localStorage.getItem('theme');
if (theme) document.documentElement.dataset.theme = theme;
$('#theme').onclick = () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  localStorage.setItem('theme', dark ? 'light' : 'dark');
};
function renderDocument(data) {
  const scroll = data.file === currentFile ? $('#scroll').scrollTop : 0;
  currentFile = data.file; base = data.base;
  const json = /\.json$/i.test(data.file);
  $('#source-pane .pane-label').textContent = json ? 'JSON' : 'MARKDOWN';
  $('#editor').setAttribute('aria-label', json ? 'JSON source' : 'Markdown source');
  $('article').classList.toggle('json-document', json);
  let jsonRecords = null;
  if (json) {
    $('article').replaceChildren();
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    if (!data.source.trim()) {
      const empty = document.createElement('div');
      empty.className = 'json-empty';
      const title = document.createElement('h2'); title.textContent = 'This JSON file is empty';
      const hint = document.createElement('p');
      hint.textContent = 'Click Edit to start writing. Use {} for an object or [] for a list.';
      empty.append(title, hint); $('article').append(empty);
      pre.hidden = true;
    } else try { const preview = previewJSON(data.source); code.textContent = preview.text; jsonRecords = preview.records; }
    catch (error) {
      const warning = document.createElement('p');
      warning.className = 'json-error'; warning.setAttribute('role', 'alert');
      warning.textContent = `Invalid JSON: ${error.message}`;
      $('article').append(warning); code.textContent = data.source;
    }
    pre.append(code); $('article').append(pre);
  } else $('article').innerHTML = DOMPurify.sanitize(marked.parse(data.source, { gfm: true }), { FORBID_TAGS: ['style', 'form', 'input', 'iframe', 'object', 'embed'], FORBID_ATTR: ['style', 'srcset'] });
  $('article').querySelectorAll('img').forEach(img => { const url = new URL(img.getAttribute('src'), base); if (['file:', 'https:', 'data:'].includes(url.protocol)) img.src = url.href; else img.removeAttribute('src'); });
  $('#outline').replaceChildren();
  $('article').querySelectorAll('h1,h2,h3').forEach((heading, index) => {
    heading.id = `section-${index}`;
    const anchor = document.createElement('a'); anchor.textContent = heading.textContent; anchor.href = `#${heading.id}`; anchor.className = heading.tagName.toLowerCase();
    anchor.onclick = event => { event.preventDefault(); heading.scrollIntoView({ behavior: 'smooth' }); };
    $('#outline').append(anchor);
  });
  if (json) {
    const note = document.createElement('p'); note.className = 'muted';
    note.textContent = !data.source.trim() ? 'Empty JSON file · ready to edit' : $('article .json-error') ? 'Fix the syntax in Edit mode. Your source is preserved.' : jsonRecords ? `JSON Lines · ${jsonRecords} records` : 'JSON document · formatted preview';
    $('#outline').append(note);
  }
  $('#filename').textContent = data.name; $('#filename').title = data.file;
  const words = data.source.trim().split(/\s+/).filter(Boolean).length;
  $('#status').textContent = json ? (jsonRecords ? `${jsonRecords} records · JSON Lines` : `${data.source.split('\n').length.toLocaleString()} lines · JSON`) : `${words.toLocaleString()} words`;
  $('#reading').textContent = `${Math.max(1, Math.ceil(words / 220))} MIN READ · AUTO-REFRESH ON`;
  $('#empty').hidden = true; $('article').hidden = false; $('#error').hidden = true; $('#scroll').scrollTop = scroll;
}
window.reader.onDocument(data => {
  documentData = data; baseline = data.source; $('#editor').value = data.source;
  renderDocument(data);
  $('#source-pane').hidden = !editing;
  $('#edit').hidden = false; $('#save').hidden = false; updateDirty();
});
$('article').onclick = event => {
  const anchor = event.target.closest('a'); if (!anchor) return;
  event.preventDefault(); const href = anchor.getAttribute('href'); if (!href) return;
  if (href.startsWith('#')) {
    const slug = decodeURIComponent(href.slice(1));
    const target = [...$('article').querySelectorAll('h1,h2,h3,h4,h5,h6')].find(h => h.id === slug || h.textContent.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-') === slug);
    target?.scrollIntoView({ behavior: 'smooth' });
  } else window.reader.link(new URL(href, base).href);
};
window.reader.onError(message => { $('#error').textContent = `Couldn’t open this file: ${message}`; $('#error').hidden = false; });
window.reader.onFind(() => { $('#search').hidden = false; $('#search').focus(); $('#search').select(); });
$('#search').oninput = event => window.reader.find(event.target.value);
$('#search').onkeydown = event => { if (event.key === 'Escape') { $('#search').hidden = true; window.reader.find(''); } if (event.key === 'Enter') window.reader.find(event.target.value); };
document.addEventListener('dragover', event => { event.preventDefault(); document.body.classList.add('dragging'); });
document.addEventListener('dragleave', event => { if (!event.relatedTarget) document.body.classList.remove('dragging'); });
document.addEventListener('drop', event => { event.preventDefault(); document.body.classList.remove('dragging'); [...event.dataTransfer.files].forEach(file => window.reader.drop(file)); });
