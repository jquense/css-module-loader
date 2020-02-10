const { createRunner, format } = require('./helpers');

describe('options', () => {
  let run;

  beforeEach(() => {
    run = createRunner({
      files: {
        './utils.css': `
          @value primary: red;
          @value secondary: blue;

          .btn {
            color: secondary
          }
         `,
      },
    });
  });

  describe('compat', () => {
    it('should enable compat plugins', async () => {
      const [src] = await run(
        `
          @value primary as utilsPrimary from './utils.css';

          :global .bar :local .foo {
            color: utilsPrimary
          }

          :export {
            height: 30rem
          }
        `,
        { compat: true },
      );

      expect(format(src)).toEqual(format`
        :import("utils.css") {
          ____a: a;
        }
        .bar .styles--foo--1ywIf {
          color: red;
        }
        :export {
          foo: styles--foo--1ywIf;
          height: 30rem;
        }
      `);
    });
  });
});
