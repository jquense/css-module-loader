const Processor = require('@modular-css/processor');

const plugin = require('../lib/plugins/compat-icss-export');

describe('compat :export', () => {
  const run = (str) => {
    const processor = new Processor({
      processing: [plugin],
    });

    return processor.string('./foo.css', str);
  };

  it('should export values', async () => {
    const result = await run(`
      :export {
        bar: 1px;
        foo: red;
      }
    `);

    expect(result.details.exported).toEqual({
      bar: '1px',
      foo: 'red',
    });

    expect(result.details.result.css.trim()).toEqual('');
  });

  it('should work with values', async () => {
    const result = await run(`
      @value foo: red;
      :export {
        baz: foo;
      }
    `);

    expect(result.details.exported).toEqual({
      baz: 'red',
    });

    expect(result.details.result.css.trim()).toEqual('');
  });
});
