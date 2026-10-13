const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { isSupported } = require('./reader.cjs');
const documents = new Map();
const pending = [];
const smoke = process.argv.includes('--smoke-test');
if (smoke) app.setPath('userData', path.join(app.getPath('temp'), 'md-reader-smoke')); 
function sendDocument(win) {
  const doc = documents.get(win);
  const file = doc?.file;
  if (!file || doc.dirty) return;
  try {
    const stat = fs.statSync(file);
    if (stat.size > 20 * 1024 * 1024) throw new Error('This file is larger than 20 MB.');
    const source = fs.readFileSync(file, 'utf8');
    doc.baseline = source;
    doc.draft = source;
    win.setTitle(`${path.basename(file)} — MD Reader`);
    win.setRepresentedFilename(file);
    win.webContents.send('document', { source, name: path.basename(file), file, base: pathToFileURL(path.dirname(file) + path.sep).href });
  } catch (error) { win.webContents.send('reader-error', error.message); }
}
function saveDocument(win) {
  const doc = documents.get(win);
  if (!doc?.file || !doc.dirty) return true;
  try {
    const disk = fs.readFileSync(doc.file, 'utf8');
    if (disk !== doc.baseline) {
      const choice = dialog.showMessageBoxSync(win, { type: 'warning', message: 'This file changed outside MD Reader.', detail: 'Overwrite the file with your edits, or cancel to keep both versions untouched.', buttons: ['Cancel', 'Overwrite'], defaultId: 0, cancelId: 0 });
      if (choice !== 1) return false;
    }
    fs.writeFileSync(doc.file, doc.draft, 'utf8');
    doc.baseline = doc.draft; doc.dirty = false;
    win.setDocumentEdited(false);
    win.webContents.send('saved', doc.baseline);
    return true;
  } catch (error) {
    dialog.showErrorBox('Couldn’t save your file', error.message);
    return false;
  }
}
function openFile(file) {
  if (!isSupported(file)) return;
  file = path.resolve(file);
  const existing = [...documents].find(([, doc]) => doc.file === file);
  if (existing) { existing[0].show(); existing[0].focus(); return; }
  const empty = [...documents].find(([, doc]) => !doc.file);
  const win = empty?.[0] || createWindow();
  documents.get(win).file = file;
  app.addRecentDocument(file);
  const update = () => sendDocument(win);
  fs.watchFile(file, { interval: 1000 }, update);
  documents.get(win).cleanup = () => fs.unwatchFile(file, update);
  if (!win.webContents.isLoading()) sendDocument(win);
}
async function chooseFile() {
  const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], filters: [{ name: 'Markdown and JSON', extensions: ['md', 'markdown', 'mdown', 'mkd', 'json'] }] });
  if (!result.canceled) result.filePaths.forEach(openFile);
}
function createWindow() {
  const win = new BrowserWindow({ width: 1080, height: 800, minWidth: 640, minHeight: 440, backgroundColor: '#f8f7f4', title: 'MD Reader', titleBarStyle: 'hiddenInset', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  documents.set(win, { file: null });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  win.webContents.on('did-finish-load', () => sendDocument(win));
  win.on('close', event => {
    if (!documents.get(win)?.dirty) return;
    const choice = dialog.showMessageBoxSync(win, { type: 'warning', message: 'Save your changes before closing?', detail: path.basename(documents.get(win).file), buttons: ['Save', 'Cancel', 'Discard Changes'], defaultId: 0, cancelId: 1 });
    if (choice === 1 || (choice === 0 && !saveDocument(win))) event.preventDefault();
  });
  win.on('closed', () => { documents.get(win)?.cleanup?.(); documents.delete(win); });
  win.loadFile('index.html');
  return win;
}
app.on('open-file', (event, file) => { event.preventDefault(); app.isReady() ? openFile(file) : pending.push(file); });
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_event, argv) => { const files = argv.filter(isSupported); files.forEach(openFile); if (!files.length) [...documents.keys()][0]?.focus(); });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'MD Reader', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { type: 'separator' }, { role: 'quit' }] },
      { label: 'File', submenu: [{ label: 'Open…', accelerator: 'CmdOrCtrl+O', click: chooseFile }, { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => saveDocument(BrowserWindow.getFocusedWindow()) }, { role: 'recentDocuments', submenu: [{ role: 'clearRecentDocuments' }] }, { type: 'separator' }, { role: 'close' }] },
      { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'paste' }, { role: 'copy' }, { role: 'selectAll' }, { label: 'Find…', accelerator: 'CmdOrCtrl+F', click: () => BrowserWindow.getFocusedWindow()?.webContents.send('find') }] },
      { label: 'View', submenu: [{ label: 'Edit Side by Side / Read', accelerator: 'CmdOrCtrl+E', click: () => BrowserWindow.getFocusedWindow()?.webContents.send('toggle-edit') }, { type: 'separator' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
      { role: 'windowMenu' }
    ]));
    ipcMain.handle('open', chooseFile);
    ipcMain.on('draft', (event, source) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const doc = documents.get(win);
      if (!doc?.file || typeof source !== 'string') return;
      doc.draft = source; doc.dirty = source !== doc.baseline;
      win.setDocumentEdited(doc.dirty);
    });
    ipcMain.handle('save', event => saveDocument(BrowserWindow.fromWebContents(event.sender)));
    ipcMain.handle('drop', (_event, file) => openFile(file));
    ipcMain.handle('link', async (event, href) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const file = documents.get(win)?.file;
      const url = new URL(href, file ? pathToFileURL(file).href : 'https://invalid.local/');
      if (['https:', 'http:', 'mailto:'].includes(url.protocol)) await shell.openExternal(url.href);
      else if (url.protocol === 'file:' && isSupported(url.pathname)) openFile(require('node:url').fileURLToPath(url));
    });
    ipcMain.on('find-text', (event, text) => { if (text) event.sender.findInPage(text); else event.sender.stopFindInPage('clearSelection'); });
    const files = [...pending, ...process.argv.slice(1).filter(isSupported)];
    if (files.length) files.forEach(openFile); else createWindow();
    app.on('activate', () => { if (!documents.size) createWindow(); });
    if (smoke) {
      const win = [...documents.keys()][0];
      await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const result = await win.webContents.executeJavaScript(`({title: document.querySelector('article h1')?.textContent, table: !!document.querySelector('article table'), unsafe: !!document.querySelector('article script, article [onerror]'), headings: document.querySelectorAll('#outline a').length, bridge: typeof window.reader.open})`);
        if (result.title !== 'Welcome to MD Reader' || !result.table || result.unsafe || result.headings < 2 || result.bridge !== 'function') throw new Error(JSON.stringify(result));
        await fs.promises.writeFile('/tmp/md-reader-preview.png', (await win.webContents.capturePage()).toPNG());
        const doc = documents.get(win);
        const original = fs.readFileSync(doc.file, 'utf8');
        await win.webContents.executeJavaScript(`document.querySelector('#edit').click(); document.querySelector('#editor').value += '\\n\\n## Editor verification'; document.querySelector('#editor').dispatchEvent(new Event('input'));`);
        const split = await win.webContents.executeJavaScript(`(() => {
          const source = document.querySelector('#editor').getBoundingClientRect();
          const preview = document.querySelector('article').getBoundingClientRect();
          return { sideBySide: source.width > 0 && preview.width > 0 && source.right <= preview.left, live: document.querySelector('article').textContent.includes('Editor verification') };
        })()`);
        if (!split.sideBySide || !split.live) throw new Error('Split preview failed: ' + JSON.stringify(split));
        await fs.promises.writeFile('/tmp/md-reader-split.png', (await win.webContents.capturePage()).toPNG());
        await win.webContents.executeJavaScript(`window.reader.save()`);
        if (!fs.readFileSync(doc.file, 'utf8').includes('## Editor verification')) throw new Error('Save did not reach disk');
        await win.webContents.executeJavaScript(`document.querySelector('#edit').click()`);
        if (!await win.webContents.executeJavaScript(`document.querySelector('article').textContent.includes('Editor verification')`)) throw new Error('Preview did not update');
        await win.webContents.executeJavaScript(`document.querySelector('#edit').click(); document.querySelector('#editor').value += ' unsaved'; document.querySelector('#editor').dispatchEvent(new Event('input'));`);
        await new Promise(resolve => setTimeout(resolve, 100));
        fs.writeFileSync(doc.file, original + '\nExternal change');
        sendDocument(win);
        if (!await win.webContents.executeJavaScript(`document.querySelector('#editor').value.endsWith(' unsaved')`)) throw new Error('External refresh destroyed draft');
        const realDialog = dialog.showMessageBoxSync;
        dialog.showMessageBoxSync = () => 0;
        if (saveDocument(win)) throw new Error('Conflict cancellation failed');
        if (!fs.readFileSync(doc.file, 'utf8').endsWith('External change')) throw new Error('Conflict overwrote disk');
        dialog.showMessageBoxSync = () => 1;
        win.close();
        if (win.isDestroyed()) throw new Error('Close cancellation failed');
        dialog.showMessageBoxSync = realDialog;
        fs.writeFileSync(doc.file, original);
        const jsonPath = path.join(app.getPath('temp'), 'md-reader-json-smoke.json');
        const jsonSource = '{"big":9007199254740993,"html":"<img src=x onerror=alert(1)>"}';
        fs.writeFileSync(jsonPath, jsonSource);
        openFile(jsonPath);
        const jsonWin = [...documents.keys()].find(w => documents.get(w).file === jsonPath);
        await new Promise(resolve => jsonWin.webContents.once('did-finish-load', resolve));
        await new Promise(resolve => setTimeout(resolve, 200));
        const jsonView = await jsonWin.webContents.executeJavaScript(`({text: document.querySelector('article code').textContent, image: !!document.querySelector('article img')})`);
        if (!jsonView.text.includes('9007199254740993') || jsonView.image) throw new Error('JSON rendering failed');
        await jsonWin.webContents.executeJavaScript(`document.querySelector('#edit').click(); document.querySelector('#editor').value = '{invalid'; document.querySelector('#editor').dispatchEvent(new Event('input'));`);
        if (!await jsonWin.webContents.executeJavaScript(`!!document.querySelector('.json-error')`)) throw new Error('Missing JSON syntax error');
        await jsonWin.webContents.executeJavaScript(`document.querySelector('#editor').value = '{"saved":true}'; document.querySelector('#editor').dispatchEvent(new Event('input'));`);
        await jsonWin.webContents.executeJavaScript(`window.reader.save()`);
        if (fs.readFileSync(jsonPath, 'utf8') !== '{"saved":true}') throw new Error('JSON save failed');
        if (await jsonWin.webContents.executeJavaScript(`!!document.querySelector('.json-error')`)) throw new Error('JSON error did not clear');
        for (const emptySource of ['', '  \n\t']) {
          await jsonWin.webContents.executeJavaScript(`document.querySelector('#editor').value = ${JSON.stringify(emptySource)}; document.querySelector('#editor').dispatchEvent(new Event('input'));`);
          const emptyState = await jsonWin.webContents.executeJavaScript(`({empty: !!document.querySelector('.json-empty'), error: !!document.querySelector('.json-error'), source: document.querySelector('#editor').value})`);
          if (!emptyState.empty || emptyState.error || emptyState.source !== emptySource) throw new Error('Empty JSON handling failed');
        }
        await jsonWin.webContents.executeJavaScript(`document.querySelector('#editor').value = '[]'; document.querySelector('#editor').dispatchEvent(new Event('input'));`);
        if (await jsonWin.webContents.executeJavaScript(`!!document.querySelector('.json-empty') || document.querySelector('article code').textContent !== '[]'`)) throw new Error('Empty JSON did not recover');
        const jsonLines = '{"id":9007199254740993}\n{"id":2}';
        await jsonWin.webContents.executeJavaScript(`document.querySelector('#editor').value = ${JSON.stringify(jsonLines)}; document.querySelector('#editor').dispatchEvent(new Event('input'));`);
        const linesView = await jsonWin.webContents.executeJavaScript(`({error: !!document.querySelector('.json-error'), status: document.querySelector('#status').textContent, text: document.querySelector('article code').textContent})`);
        if (linesView.error || !linesView.status.includes('2 records') || !linesView.text.includes('9007199254740993')) throw new Error('JSON Lines preview failed');
        await jsonWin.webContents.executeJavaScript(`window.reader.save()`);
        if (fs.readFileSync(jsonPath, 'utf8') !== jsonLines) throw new Error('JSON Lines save changed source');
        console.log('JSON LINES SMOKE PASS: detection, preview, exact source save');
        console.log('EMPTY JSON SMOKE PASS: empty, whitespace, source preserved, recovery');
        console.log('JSON SMOKE PASS: safe preview, precision, editing, validation, saving');
        console.log('SMOKE PASS: side-by-side layout, live preview, render, edit, save, preview, external-change protection, conflict cancel, close cancel', JSON.stringify(result)); app.exit(0);
      } catch (error) { console.error(error); app.exit(1); }
    }
  });
}
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
