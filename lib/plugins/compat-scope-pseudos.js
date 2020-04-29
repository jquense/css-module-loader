/**
 * Forked from https://github.com/css-modules/postcss-modules-local-by-default
 * but inverted, assumes local scope and turns the namespace pseudos into normal ones
 */
/* eslint-disable no-param-reassign */
/* eslint-disable default-case */
const selectorParser = require('postcss-selector-parser');

const plugin = 'css-modules-loader-compat-scope-pseudos';

const isSpacing = (node) => node.type === 'combinator' && node.value === ' ';

const isScopePseudo = (node) =>
  node.value === ':local' || node.value === ':global';

function normalizeNodeArray(nodes) {
  const array = [];

  nodes.forEach((x) => {
    if (Array.isArray(x)) {
      normalizeNodeArray(x).forEach((item) => {
        array.push(item);
      });
    } else if (x) {
      array.push(x);
    }
  });

  if (array.length > 0 && isSpacing(array[array.length - 1])) {
    array.pop();
  }
  return array;
}

function localizeNode(rule) {
  const transform = (node, context) => {
    if (context.ignoreNextSpacing && !isSpacing(node)) {
      throw new Error(`Missing whitespace after ${context.ignoreNextSpacing}`);
    }
    if (context.enforceNoSpacing && isSpacing(node)) {
      throw new Error(`Missing whitespace before ${context.enforceNoSpacing}`);
    }

    let newNodes;
    switch (node.type) {
      case 'root': {
        let resultingGlobal;

        newNodes = node.nodes.map((n) => {
          const nContext = {
            global: context.global,
            lastWasSpacing: true,
          };

          n = transform(n, nContext);

          if (typeof resultingGlobal === 'undefined') {
            resultingGlobal = nContext.global;
          } else if (resultingGlobal !== nContext.global) {
            throw new Error(
              `Inconsistent rule global/local result in rule "${node}" (multiple selectors must result in the same mode for the rule)`,
            );
          }

          return n;
        });

        context.global = resultingGlobal;

        node.nodes = normalizeNodeArray(newNodes);
        break;
      }
      case 'selector': {
        newNodes = node.map((childNode) => transform(childNode, context));

        node = node.clone();
        node.nodes = normalizeNodeArray(newNodes);
        break;
      }
      case 'combinator': {
        if (isSpacing(node)) {
          if (context.ignoreNextSpacing) {
            context.ignoreNextSpacing = false;
            context.lastWasSpacing = false;
            context.enforceNoSpacing = false;
            return null;
          }
          context.lastWasSpacing = true;
          return node;
        }
        break;
      }
      case 'pseudo': {
        let childContext;
        const isNested = !!node.length;
        const isScopingPsuedo = isScopePseudo(node);

        // :local(.foo)
        if (isNested) {
          if (isScopingPsuedo) {
            if (node.nodes.length === 0) {
              throw new Error(`${node.value}() can't be empty`);
            }

            if (context.inside) {
              throw new Error(
                `A ${node.value} is not allowed inside of a ${context.inside}(...)`,
              );
            }

            childContext = {
              global: node.value === ':global',
              inside: node.value,
            };
            if (childContext.global) {
              break;
            }

            newNodes = node
              .map((childNode) => transform(childNode, childContext))
              .reduce((acc, next) => acc.concat(next.nodes), []);

            if (newNodes.length) {
              const { before, after } = node.spaces;

              const first = newNodes[0];
              const last = newNodes[newNodes.length - 1];

              first.spaces = { before, after: first.spaces.after };
              last.spaces = { before: last.spaces.before, after };
            }

            node = newNodes;

            break;
          } else {
            childContext = {
              global: context.global,
              inside: context.inside,
              lastWasSpacing: true,
            };
            newNodes = node.map((childNode) =>
              transform(childNode, childContext),
            );

            node = node.clone();
            node.nodes = normalizeNodeArray(newNodes);
          }
          break;

          // :local .foo .bar
        } else if (isScopingPsuedo) {
          if (context.inside) {
            throw new Error(
              `A ${node.value} is not allowed inside of a ${context.inside}(...)`,
            );
          }

          const addBackSpacing = !!node.spaces.before;

          context.ignoreNextSpacing = context.lastWasSpacing
            ? node.value
            : false;

          context.enforceNoSpacing = context.lastWasSpacing
            ? false
            : node.value;

          context.global = node.value === ':global';

          // because this node has spacing that is lost when we remove it
          // we make up for it by adding an extra combinator in since adding
          // spacing on the parent selector doesn't work
          return addBackSpacing
            ? selectorParser.combinator({ value: ' ' })
            : null;
        }
        break;
      }
      case 'id':
      case 'class': {
        if (!node.value) {
          throw new Error(`Invalid ${node.type} selector syntax`);
        }

        if (!context.global) {
          break;
        }

        const innerNode = node.clone();
        innerNode.spaces = { before: '', after: '' };

        node = selectorParser.pseudo({
          value: ':global',
          nodes: [innerNode],
          spaces: node.spaces,
        });

        break;
      }
    }

    context.lastWasSpacing = false;
    context.ignoreNextSpacing = false;
    context.enforceNoSpacing = false;

    return node;
  };

  const rootContext = {
    global: false,
  };

  rootContext.selector = selectorParser((root) => {
    transform(root, rootContext);
  }).processSync(rule, { updateSelector: false, lossless: true });

  return rootContext;
}

module.exports = (css) => {
  css.walkRules((rule) => {
    if (
      rule.parent &&
      rule.parent.type === 'atrule' &&
      /keyframes$/i.test(rule.parent.name)
    ) {
      // ignore keyframe rules
      return;
    }

    if (
      rule.nodes &&
      rule.selector.slice(0, 2) === '--' &&
      rule.selector.slice(-1) === ':'
    ) {
      // ignore custom property set
      return;
    }

    const context = localizeNode(rule);

    rule.selector = context.selector;
  });
};

module.exports.postcssPlugin = plugin;
module.exports.phase = 'before';
