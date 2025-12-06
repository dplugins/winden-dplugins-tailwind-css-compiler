/**
 * Monaco Editor PlainJS Language Registration
 *
 * Registers a custom "plainjs" language that provides JavaScript syntax highlighting
 * without requiring TypeScript language service (ts.worker.js).
 *
 * This is used for the Tailwind config editor where we only need:
 * - Syntax highlighting
 * - Auto-closing brackets/quotes
 * - Comment support
 *
 * NO TypeScript features needed (type checking, IntelliSense, etc.)
 */

import type { Monaco } from '@monaco-editor/react';

/**
 * Register PlainJS language with Monaco Editor
 *
 * @param monaco - Monaco instance
 */
export function registerPlainJSLanguage(monaco: Monaco): void {
  // Register the language ID
  monaco.languages.register({ id: 'plainjs' });

  // Set syntax highlighting tokens using Monarch
  monaco.languages.setMonarchTokensProvider('plainjs', {
    defaultToken: '',
    tokenPostfix: '.js',

    keywords: [
      'break', 'case', 'catch', 'class', 'continue', 'const',
      'constructor', 'debugger', 'default', 'delete', 'do', 'else',
      'export', 'extends', 'false', 'finally', 'for', 'from',
      'function', 'get', 'if', 'import', 'in', 'instanceof',
      'let', 'new', 'null', 'return', 'set', 'static', 'super',
      'switch', 'this', 'throw', 'true', 'try', 'typeof',
      'undefined', 'var', 'void', 'while', 'with', 'yield'
    ],

    operators: [
      '<=', '>=', '==', '!=', '===', '!==', '=>', '+', '-', '**',
      '*', '/', '%', '++', '--', '<<', '</', '>>', '>>>', '&',
      '|', '^', '!', '~', '&&', '||', '??', '?', ':', '=',
      '+=', '-=', '*=', '**=', '/=', '%=', '<<=', '>>=', '>>>=',
      '&=', '|=', '^=', '@',
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    digits: /\d+(_+\d+)*/,
    octaldigits: /[0-7]+(_+[0-7]+)*/,
    binarydigits: /[0-1]+(_+[0-1]+)*/,
    hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

    tokenizer: {
      root: [
        [/[{}]/, 'delimiter.bracket'],
        { include: 'common' }
      ],

      common: [
        // Identifiers and keywords
        [/[a-z_$][\w$]*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],
        [/[A-Z][\w\$]*/, 'type.identifier'],

        // Whitespace
        { include: '@whitespace' },

        // Delimiters and operators
        [/[()[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'delimiter',
            '@default': ''
          }
        }],

        // Annotations
        [/@\s*[a-zA-Z_\$][\w\$]*/, 'annotation'],

        // Numbers
        [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
        [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
        [/0[xX](@hexdigits)n?/, 'number.hex'],
        [/0[oO]?(@octaldigits)n?/, 'number.octal'],
        [/0[bB](@binarydigits)n?/, 'number.binary'],
        [/(@digits)n?/, 'number'],

        // Delimiter
        [/[;,.]/, 'delimiter'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],  // Unclosed string
        [/'([^'\\]|\\.)*$/, 'string.invalid'],  // Unclosed string
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
        [/`/, 'string', '@string_backtick'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, ''],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop']
      ],

      string_backtick: [
        [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
        [/[^\\`$]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/`/, 'string', '@pop']
      ],

      bracketCounting: [
        [/\{/, 'delimiter.bracket', '@bracketCounting'],
        [/\}/, 'delimiter.bracket', '@pop'],
        { include: 'common' }
      ],
    },
  });

  // Set language configuration (brackets, auto-closing, etc.)
  monaco.languages.setLanguageConfiguration('plainjs', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string', 'comment'] },
      { open: '`', close: '`', notIn: ['string', 'comment'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
    ],
  });
}
