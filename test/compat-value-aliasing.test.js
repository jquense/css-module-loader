const path = require('path');
const Processor = require('@modular-css/processor');
const plugin = require('../lib/plugins/compat-value-aliasing');

describe('compat value aliasing', () => {
  const run = async (str, opts = {}) => {
    const processor = new Processor({
      before: [plugin],
      resolvers: [(src, file) => path.resolve(path.dirname(src), file)],
      ...opts,
    });

    await processor.string(
      './utils.css',
      `
        @value primary: red;
        @value secondary: blue;
      `,
    );

    return processor.string('./foo.css', str);
  };

  it('should import and replace values', async () => {
    const result = await run(`
      @value primary as utilsPrimary from './utils.css';
    `);

    expect(result.details.result.css).toContain(
      `
:import('./utils.css') {
  utilsPrimary: primary
}
`.trim(),
    );
  });

  it('should ignore namespace values', async () => {
    const result = await run(`
      @value * as utilsPrimary from './utils.css';
    `);

    expect(result.details.result.css).not.toContain(":import('./utils.css')");
  });

  it('works with compat-icss-import', async () => {
    const result = await run(
      `
        @value primary as utilsPrimary from './utils.css';

        .foo {
          color: utilsPrimary
        }
      `,
      {
        processing: [require('../lib/plugins/compat-icss-import')],
      },
    );

    expect(result.details.result.css).toContain('color: red');
  });
});
