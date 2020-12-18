import fs = require('fs');
import vscodeTextmate = require('../src/main');
import * as oniguruma from 'oniguruma';
import * as path from 'path';

/**
 * Utility to read a file as a promise
 */
function readFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (error, data) => (error ? reject(error) : resolve(data)));
  });
}

// 就创建了主题,没干其他的
const registry = new vscodeTextmate.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
    createOnigString: (str) => new oniguruma.OnigString(str),
  }),
  loadGrammar: (scopeName) => {
    console.log('域名', scopeName);
    if (scopeName === 'source.js') {
      // https://github.com/textmate/javascript.tmbundle/blob/master/Syntaxes/JavaScript.plist
      return readFile(path.resolve(__dirname, './JavaScript.plist')).then((data) => vscodeTextmate.parseRawGrammar(data.toString()));
    }
    console.log(`Unknown scope name: ${scopeName}`);
    return null;
  },
});

// Load the JavaScript grammar and any other grammars included by it async.
registry.loadGrammar('source.js').then((grammar) => {
  const text = [`function sayHello(name) {`, `\treturn "Hello, " + name;`, `}`];
  console.log('文本',text);
  let ruleStack = vscodeTextmate.INITIAL;
  for (let i = 0; i < text.length; i++) {
    const line = text[i];
    const lineTokens = grammar.tokenizeLine(line, ruleStack);
    console.log(`\nTokenizing line: ${line}`);
    for (let j = 0; j < lineTokens.tokens.length; j++) {
      const token = lineTokens.tokens[j];
      console.log(
        ` - token from ${token.startIndex} to ${token.endIndex} ` +
          `(${line.substring(token.startIndex, token.endIndex)}) ` +
          `with scopes ${token.scopes.join(', ')}`
      );
    }
    ruleStack = lineTokens.ruleStack;
  }
});
