exports.isMarkdown = file => typeof file === 'string' && /\.(md|markdown|mdown|mkd)$/i.test(file);
exports.isSupported = file => typeof file === 'string' && /\.(md|markdown|mdown|mkd|json)$/i.test(file);
