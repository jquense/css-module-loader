/** Taken from css-loader */

const path = require('path');
const cssesc = require('cssesc');
const loaderUtils = require('loader-utils');

// eslint-disable-next-line no-control-regex
const filenameReservedRegex = /[<>:"/\\|?*\x00-\x1F]/g;
// eslint-disable-next-line no-control-regex
const reControlChars = /[\u0000-\u001f\u0080-\u009f]/g;
const reRelativePath = /^\.+/;

module.exports = function getLocalName(
  filename,
  localName,
  loaderContext,
  loaderOptions,
) {
  const hashPrefix = loaderOptions.hashPrefix || '';
  const context = loaderOptions.context || loaderContext.rootContext;
  const request = path.relative(context || '', filename);

  // eslint-disable-next-line no-param-reassign
  const content = `${hashPrefix + request}+${localName}`;

  // Using `[path]` placeholder outputs `/` we need escape their
  // Also directories can contains invalid characters for css we need escape their too
  return cssesc(
    loaderUtils
      .interpolateName(
        { ...loaderContext, resourcePath: filename },
        loaderOptions.localIdentName || '[name]--[local]--[hash:base64:5]',
        {
          context,
          content,
          hashPrefix,
          regexp: loaderOptions.localIdentRegExp || null,
        },
      )
      // For `[hash]` placeholder
      .replace(/^((-?[0-9])|--)/, '_$1')
      .replace(filenameReservedRegex, '-')
      .replace(reControlChars, '-')
      .replace(reRelativePath, '-')
      .replace(/\./g, '-'),
    { isIdentifier: true },
  ).replace(/\\\[local\\\]/gi, localName);
};
