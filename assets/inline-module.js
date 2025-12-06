const loaderMap = window['inline-module-loaders'] || {};
const currentScript = document.currentScript || document.querySelector('script[src*="inline-module"]') || document.querySelector('script');

// https://github.com/WICG/import-maps
const map = {imports: {}, scopes: {}};
const installed = new Set();
const contentCache = new Map();

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function loadContent(url) {
  if(contentCache.has(url)) {
    return contentCache.get(url);
  }

  const response = await fetch(url);
  if(!response.ok) {
    throw new Error(`[inline-module] Failed to load "${url}" (${response.status}: ${response.statusText})`);
  }

  const text = await response.text();
  contentCache.set(url, text);
  return text;
}

// replace code
function replaceImport(code, map) {
  const importExp = /^(\s*import\s+[\s\S]*?from\s*['"`])([\s\S]*?)(['"`])/img;
  return code.replace(importExp, (a, b, c, d) => {
    const url = map[c];
    if(url) {
      return `${b}${url}${d}`;
    }
    return `${b}${c}${d}`;
  });
}

async function getBlobURL(module, replaceImportURL = false, map = {}) {
  let jsCode = module.textContent;
  if(module.hasAttribute('src')) {
    const url = module.getAttribute('src');
    jsCode = await loadContent(url);
    module.textContent = jsCode;
  }
  if(replaceImportURL) {
    jsCode = replaceImport(jsCode, map);
  }
  let loaders = module.getAttribute('loader');

  if(loaders) {
    loaders = loaders.split(/\s*>\s*/);
    jsCode = await loaders.reduce(async (codePromise, loader) => {
      const code = await codePromise;
      if(!loaderMap[loader]) {
        throw new Error(`[inline-module] Unknown loader "${loader}". Did you register it in window.inline-module-loaders?`);
      }

      const {transform, imports} = loaderMap[loader];
      const result = await Promise.resolve(transform(code, {sourceMap: true, filename: module.getAttribute('name') || module.id || 'anonymous'}));
      const {code: resolved, map: sourceMap} = result;
      let transformed = resolved;
      if(sourceMap) {
        transformed = `${resolved}\n\n//# sourceMappingURL=data:application/json;base64,${toBase64(JSON.stringify(sourceMap))}`;
      }
      Object.assign(map.imports, imports);
      return transformed;
    }, Promise.resolve(jsCode));
  }
  return createBlob(jsCode, 'text/javascript');
}

function createBlob(code, type = 'text/plain') {
  const blob = new Blob([code], {type});
  const blobURL = URL.createObjectURL(blob);
  return blobURL;
}

async function setup() {
  const modules = document.querySelectorAll('script[type="inline-module"]');
  const importMap = {};
  const loadModules = [];

  const importMapEl = document.querySelector('script[type="importmap"]');
  if(importMapEl && currentScript) {
    console.warn('Cannot update importmap after <script type="importmap"> is set. Please use <script type="inline-module-importmap"> instead.');
  }

  const moduleEntries = await Promise.all(
    [...modules].map(async (module) => {
      const {id} = module;
      const name = module.getAttribute('name');
      const url = await getBlobURL(module, !!importMapEl, importMap);
      return {id, name, url};
    })
  );

  moduleEntries.forEach(({id, name, url}) => {
    if(id) {
      importMap[`#${id}`] = url;
      importMap[`//#${id}`] = url; // for some platform only support protocals
    }
    if(name) {
      importMap[name] = url;
      importMap[`//${name}`] = url; // for some platform only support protocals
    }
    loadModules.push(url);
  });

  const externalMapEl = document.querySelector('script[type="inline-module-importmap"]');
  if(externalMapEl) {
    const externalMap = JSON.parse(externalMapEl.textContent);
    Object.assign(map.imports, externalMap.imports);
    Object.assign(map.scopes, externalMap.scopes);
  }

  Object.assign(map.imports, importMap);

  if(!importMapEl) {
    const mapEl = document.createElement('script');
    mapEl.setAttribute('type', 'importmap');
    mapEl.textContent = JSON.stringify(map);
    insertAfterReference(mapEl);
  }

  for(const url of loadModules) {
    if(!installed.has(url)) { // mount
      const el = document.createElement('script');
      el.async = false;
      el.setAttribute('type', 'module');
      el.setAttribute('src', url);
      insertAfterReference(el);
      installed.add(url);
    }
  }
}

function insertAfterReference(node) {
  if(currentScript && currentScript.parentNode) {
    currentScript.parentNode.insertBefore(node, currentScript.nextSibling);
  } else {
    (document.head || document.body || document.documentElement).appendChild(node);
  }
}

if(!currentScript) {
  console.warn('[inline-module] Unable to determine the executing script tag — falling back to appending elements to <head>.');
}

if(!currentScript || currentScript.getAttribute('setup') !== 'false') {
  setup().catch((error) => console.error('[inline-module] Setup failed:', error));
}

window.inlineModuleSetup = () => setup();
window.inlineModuleMap = map;

window.inlineImport = async (moduleID) => {
  const {imports} = map;
  let blobURL = null;
  if(moduleID in imports) blobURL = imports[moduleID];
  else {
    let module;
    if(/^#/.test(moduleID)) {
      module = document.querySelector(`script[type="inline-module"]${moduleID}`);
    }
    if(!module) {
      module = document.querySelector(`script[type="inline-module"][name="${moduleID}"]`);
    }
    if(module) {
      blobURL = await getBlobURL(module);
      imports[moduleID] = blobURL;
    }
  }
  if(blobURL) {
    const result = await import(blobURL);
    return result;
  }
  return null;
};
