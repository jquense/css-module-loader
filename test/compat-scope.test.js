const postcss = require('postcss');

const plugin = require('../lib/plugins/compat-scope-pseudos');

describe('scoping compat', () => {
  test.each([
    ['do nothing by default', '.foobar {}', '.foobar {}'],
    [
      'ignore global selectors',
      ':global(.foo .bar) {}',
      ':global(.foo .bar) {}',
    ],
    ['allow narrow local selectors', ':local(.foo .bar) {}', '.foo .bar {}'],
    ['allow broad local selectors', ':local .foo .bar {}', '.foo .bar {}'],
    [
      'convert broad global selectors',
      ':global .foo .bar {}',
      ':global(.foo) :global(.bar) {}',
    ],
    [
      'broad global should be limited to selector',
      ':global .foo, .bar :global, .foobar :global {}',
      ':global(.foo), .bar, .foobar {}',
    ],
    [
      'broad global should be limited to nested selector',
      '.foo:not(:global .bar).foobar {}',
      '.foo:not(:global(.bar)).foobar {}',
    ],
    [
      'broad global and local should allow switching',
      '.foo :global .bar :local .foobar :local .barfoo {}',
      '.foo :global(.bar) .foobar .barfoo {}',
    ],
  ])('should %s', (_, input, expected) => {
    const result = postcss(plugin).process(input).css;

    expect(result).toEqual(expected);
  });
});
