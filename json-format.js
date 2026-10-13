// Validate with JSON.parse, but format original tokens to preserve large numbers.
(function (root) {
  function formatJSON(source) {
    JSON.parse(source);
    const tokens = source.match(/"(?:\\.|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:]+/g) || [];
    let depth = 0;
    let result = '';
    const newline = () => '\n' + '  '.repeat(depth);
    tokens.forEach((token, i) => {
      const previous = tokens[i - 1];
      if (token === '{' || token === '[') {
        result += token; depth++;
        if (tokens[i + 1] !== (token === '{' ? '}' : ']')) result += newline();
      } else if (token === '}' || token === ']') {
        depth--;
        if (previous !== (token === '}' ? '{' : '[')) result += newline();
        result += token;
      } else if (token === ',') result += ',' + newline();
      else if (token === ':') result += ': ';
      else result += token;
    });
    return result;
  }
  function previewJSON(source) {
    try { return { text: formatJSON(source), records: null }; }
    catch (error) {
      const lines = source.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) throw error;
      const formatted = lines.map((line, index) => {
        try { return formatJSON(line); }
        catch (lineError) { throw new SyntaxError(`JSON Lines record ${index + 1}: ${lineError.message}`); }
      });
      return { text: formatted.join('\n\n'), records: formatted.length };
    }
  }
  if (typeof module !== 'undefined') module.exports = { formatJSON, previewJSON };
  else { root.formatJSON = formatJSON; root.previewJSON = previewJSON; }
})(globalThis);
