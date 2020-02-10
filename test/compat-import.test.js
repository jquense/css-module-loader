const path = require('path');
const Processor = require('@modular-css/processor');
const plugin = require('../lib/plugins/compat-icss-import');

describe('compat :import', () => {
  const run = async str => {
    const processor = new Processor({
      processing: [plugin],
      resolvers: [(src, file) => path.resolve(path.dirname(src), file)],
    });

    await processor.string(
      './utils.css',
      `
        @value primary: red;
        @value secondary: blue;

        .btn {
          color: secondary
        }
      `,
    );

    return processor.string('./foo.css', str);
  };

  it('should import and replace values', async () => {
    const result = await run(`
      :import("./utils.css") {
        utilsPrimary: primary
      }

      .foo {
        color: utilsPrimary
      }
    `);

    expect(result.details.result.css).toContain('color: red');
  });
});
