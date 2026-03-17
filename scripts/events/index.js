/* global hexo */

'use strict';

const nunjucks = require('nunjucks');
const { readFileSync } = require('fs');
const { dirname } = require('path');

// Re-register nunjucks renderer to fix compatibility with hexo-renderer-nunjucks.
// That package calls nunjucks.compile(text) without an env, so nunjucks falls back
// to `new Environment()` (no loaders), causing {% extends '_layout.njk' %} to
// throw "template not found: _layout.njk". By registering after npm plugins are
// loaded, this renderer takes priority and correctly sets dirname(data.path) as
// the nunjucks template search path.
const nunjucksCfg = {
  autoescape      : false,
  throwOnUndefined: false,
  trimBlocks      : false,
  lstripBlocks    : false
};

function addNunjucksFilters(env) {
  env.addFilter('toarray', value => {
    if (Array.isArray(value)) return value;
    if (typeof value.toArray === 'function') return value.toArray();
    if (value instanceof Map) return [...value.values()];
    if (value instanceof Set || typeof value === 'string') return [...value];
    if (typeof value === 'object' && value !== null) return Object.values(value);
    return [];
  });
  env.addFilter('safedump', (json, spacer) => {
    return typeof json !== 'undefined' && json !== null ? JSON.stringify(json, null, spacer) : '""';
  });
}

function njkCompile(data) {
  const env = nunjucks.configure(data.path ? dirname(data.path) : '.', nunjucksCfg);
  addNunjucksFilters(env);
  const text = 'text' in data ? data.text : readFileSync(data.path, 'utf8');
  return nunjucks.compile(text, env, data.path);
}

function njkRenderer(data, locals) {
  return njkCompile(data).render(locals);
}

njkRenderer.compile = data => locals => njkCompile(data).render(locals);

hexo.extend.renderer.register('njk', 'html', njkRenderer, true);

hexo.extend.filter.register('before_generate', () => {
  // Merge config
  require('./lib/config')(hexo);
  // Set vendors
  require('./lib/vendors')(hexo);
  // Add filter type `theme_inject`
  require('./lib/injects')(hexo);
  // Highlight
  require('./lib/highlight')(hexo);
  // Menu and sub menu
  require('./lib/navigation')(hexo);
}, 0);

hexo.on('ready', () => {
  if (!/^(g|s)/.test(hexo.env.cmd) || process.argv.includes('--next-disable-banner')) return;
  const { version } = require('../../package.json');
  hexo.log.info(`==================================
  ███╗   ██╗███████╗██╗  ██╗████████╗
  ████╗  ██║██╔════╝╚██╗██╔╝╚══██╔══╝
  ██╔██╗ ██║█████╗   ╚███╔╝    ██║
  ██║╚██╗██║██╔══╝   ██╔██╗    ██║
  ██║ ╚████║███████╗██╔╝ ██╗   ██║
  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝   ╚═╝
========================================
NexT version ${version}
Documentation: https://theme-next.js.org
========================================`);
});
