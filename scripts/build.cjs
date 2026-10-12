const packager = require('@electron/packager');
packager({ dir: '.', out: 'dist', name: 'MD Reader', executableName: 'MD Reader', platform: 'darwin', arch: 'arm64', overwrite: true, appBundleId: 'local.janrudovsky.mdreader', appVersion: '1.0.0', icon: 'assets/reader.icns', ignore: [/^\/dist/, /^\/test/, /^\/scripts/], extendInfo: {
  CFBundleDocumentTypes: [{ CFBundleTypeName: 'Markdown document', CFBundleTypeRole: 'Editor', LSHandlerRank: 'Owner', CFBundleTypeExtensions: ['md', 'markdown', 'mdown', 'mkd'], LSItemContentTypes: ['net.daringfireball.markdown'] }],
  UTImportedTypeDeclarations: [{ UTTypeIdentifier: 'net.daringfireball.markdown', UTTypeDescription: 'Markdown document', UTTypeConformsTo: ['public.plain-text'], UTTypeTagSpecification: { 'public.filename-extension': ['md', 'markdown', 'mdown', 'mkd'], 'public.mime-type': 'text/markdown' } }]
} }).then(paths => console.log(paths.join('\n'))).catch(error => { console.error(error); process.exit(1); });
