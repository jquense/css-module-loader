const path = require('path');

const Processor = require('@modular-css/processor');

const plugin = require('../lib/plugins/compat-composes-delimiter');

describe('compat composes', () => {
  const run = async (str) => {
    const processor = new Processor({
      before: [plugin],
      resolvers: [(src, file) => path.resolve(path.dirname(src), file)],
    });

    await processor.string(
      './utils.css',
      `
        .foo {
          color: blue;
        }

        .bar {
          bar: red;
        }
        .baz {
          baz: red;
        }
      `,
    );

    return processor.string('./foo.css', str);
  };

  it('should handle escapes', async () => {
    const results = await run(`
      .btn {
        composes: hover\\:md\\:bar from global;

        color: red;
      }
    `);

    expect(results.exports.btn).toHaveLength(2);
  });

  test.each([
    ['foo bar baz'],
    ['foo bar, baz'],
    ['foo  bar  \t baz'],
    ['foo,  bar, baz'],
  ])('should handle: %s', async (input) => {
    const result = await run(`
        .btn {
          composes: ${input} from "./utils.css";

          color: red;
        }
      `);

    expect(result.exports.btn).toHaveLength(4);
  });

  test.each([
    ['foo bar baz'],
    ['foo bar, baz'],
    ['foo  bar  \t baz'],
    ['foo,  bar, baz'],
  ])('should locally handle: %s', async (input) => {
    const result = await run(`
        .foo {color: blue;}

        .bar { bar: red; }
        .baz { baz: red; }

        .btn {
          composes: ${input};

          color: red;
        }
      `);

    expect(result.exports.btn).toHaveLength(4);
  });
});
