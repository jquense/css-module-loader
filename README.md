# `css-module-loader`

An implementation of webpack CSS module support independent of `css-loader`.

## Usage

```sh
yarn add css-module-loader -D
```

To configure, add `css-module-loader` _immediately_ after `css-loader`, disable
any existing module options on `css-loader`.

**webpack.config.js**

```diff
{
  ...
  module: {
    rules: [
      {
        test: /\.module\.css$/
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
-             modules: true
+             importLoaders: 1,
            }
          },
+         'css-module-loader'
        ]
      }
    ]
  }
}
```

If you are using css modules with a preprocessor, make sure that `css-module-loader` comes before them. It should only receive CSS (plus CSS module syntax)

```diff
  test: /\.module\.css$/,
  use: [
    'style-loader',
    {
      loader: 'css-loader',
      options: {
-       importLoaders: 1
+       importLoaders: 2
      }
    },
+   'css-module-loader',
    'sass-loader'
  ]
```

## Differences Between `css-loader`

There are two big differences between the existing support in
`css-loader`.

The first is that it's not coupled to css-loader. By not being embedded in `css-loader`, users have more flexibility around upgrades, extensions and modifications. We can also update `css-module-loader` independently!

The second difference is that `css-module-loader` does not use the original
css-modules implementation. Instead, it is built on top of [modular-css](https://m-css.com/). `modular-css` is an actively developed off shoot of the original css-modules. It has more features, less footguns, and better and broader tooling support.

### Why not use the "official" css-modules?

The original css module tooling is mostly abandoned at this point. The original
authors have moved on to new things and much of the tooling is stuck in a "bug fix" only limbo. This hasn't been a severe problem because css-modules is very
stable, and fairly simple, but there are a lot of sharp edges in the implementation, that prevents certain DX improvements, like more helpful errors.

On the other hand `modular-css` is actively maintained, as well as very stable. It addresses a bunch of the css-modules sharp edges (like ambigious scoping rules) and adds in a few quality of life features, like `:external` and module level `composes`. `modular-css` is also much easier to extend and hack on!

### Migrating from css-loader

In many cases the switch to `modular-css` should be transparent, many of the "breaking" differences are around less common usage patterns. Even still, `css-module-loader` includes a "compat" mode that should help ease the transition

Enable compat mode via a loader option:

```js
  {
    loader: 'css-module-loader',
    options: {
      compat: true
    }
  }
```

Different compatibilty plugins can also be more finely enabled/disabled

```js
  {
    loader: 'css-module-loader',
    options: {
      compat: {
        scoping: false,
        composesDelimiter: false,
        icssImports: true,
        icssExports: true,
      }
    }
  }
```

The compatiblity plugins are outlined below:

#### `scoping`

ref: https://m-css.com/guide/#global

`css-modules` allows `:global` and `:local` scoping to nest, whereas `modular-css` only allows the `:global(.foo)` pseudo for marking a selector
as global.

**When to enable:** If your code contains none-parameterized `:global` or `:local` pseudos like

```css
.my-class :global .token {
}
```

**How to migrate:** Change to the parameterized form `:global(.token) {}`

#### `composesDelimiter`

css-modules uses whitespace to delineate between `composes` classes for multiple classes:

```css
.btn {
  composes: appearance-none text-white from global;
}
```

`modular-css` is a bit stricter, requiring a comma (`,`);

```css
.btn {
  composes: appearance-none, text-white from global;
}
```

**When to enable:** Migrating code that uses composes with multiple classes

**How to migrate:** use comma seperators

#### `icssExports`

A very niche feature of css-modules that you may not even know is possible.
css-modules, contains a little IL (intermediary language) for defining imports and exports manually. Generally this is only used by tooling, as part of a compile step, but it is possible to write manually as well.

**When to enable:** If your code contains explicit `:export {}` rules

```css
:export {
  myColor: red;
  navbarHeight: 4rem;
}
```

**How to migrate:** Switch to using `@value` (see: https://m-css.com/guide/#values)

#### `icssImports`

The pair to `icssExports`, allows importing and replacing local values via the ICSS
import syntax

**When to enable:** If your code contains explicit `:import("./file.css") {}` rules

```css
:import('./utils.css') {
  utilsPrimary: primary;
}

.foo {
  color: utilsPrimary;
}
```

**How to migrate:** Switch to using `@value` and `@value * as ns` (see: https://m-css.com/guide/#values)

### Other notable (small) differences

These are things that aren't easy to write a compat plugin for and so may need
direct migration.

- importing `@value` from other files can only import actual `@value`s not classes
- `@value`s are not replaced in selectors. use `:external` to reference identifiers from other files
