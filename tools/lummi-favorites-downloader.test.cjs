const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const test = require('node:test');
const { JSDOM } = require('jsdom');

async function runFavoriteClick({ html, pageUrl, metadata }) {
  const dom = new JSDOM(`
    ${html}
  `, { url: pageUrl, runScripts: 'outside-only' });
  const downloads = [];
  const fetchCalls = [];
  const blobs = [];
  dom.window.URL.createObjectURL = (blob) => {
    blobs.push(blob);
    return 'blob:test';
  };
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.setTimeout = () => 0;
  dom.window.HTMLAnchorElement.prototype.click = function click() {
    downloads.push(this.download);
  };
  dom.window.fetch = async (url, init) => {
    fetchCalls.push({ url, init });
    return {
      ok: true,
      json: async () => metadata,
    };
  };
  dom.window.console.log = () => {};
  dom.window.console.error = () => {};

  const source = await readFile(require.resolve('./lummi-favorites-downloader.js'), 'utf8');
  dom.window.eval(source);
  dom.window.document.querySelector('svg').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const sidecars = await Promise.all(blobs.map((blob) => new Promise((resolve, reject) => {
    const reader = new dom.window.FileReader();
    reader.addEventListener('load', () => resolve(JSON.parse(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsText(blob);
  })));

  return { downloads, fetchCalls, sidecars };
}

test('grid favorite downloads only the card JSON sidecar', async () => {
  const result = await runFavoriteClick({
    html: `
      <div class="group/item">
        <a href="/photo/elderly-rider-in-style-dbnrq"></a>
        <button data-id="favorite-image-button"><svg></svg></button>
      </div>
    `,
    pageUrl: 'https://www.lummi.ai/photo/different-open-photo-abcde',
    metadata: {
      id: '438d7b4b-c02c-48e9-b8f9-f8f670b1ac87',
      slug: 'elderly-rider-in-style-dbnrq',
      url: 'https://assets.lummi.ai/assets/original',
    },
  });

  assert.deepEqual(result.downloads, ['elderly-rider-in-style-dbnrq-lummi.json']);
  assert.equal(result.fetchCalls.length, 1);
  assert.equal(result.fetchCalls[0].url, '/api/actions/getImage');
  assert.deepEqual(JSON.parse(result.fetchCalls[0].init.body), {
    params: [{ slug: 'elderly-rider-in-style-dbnrq' }],
  });
});

test('detail favorite downloads the current photo JSON sidecar', async () => {
  const result = await runFavoriteClick({
    html: '<button data-id="favorite-image-button"><svg></svg></button>',
    pageUrl: 'https://www.lummi.ai/photo/ethereal-silhouette-2hadg',
    metadata: {
      id: '056d1dee-a380-4ad7-a2a7-ebea914f6a64',
      slug: 'ethereal-silhouette-2hadg',
      url: 'https://assets.lummi.ai/assets/original',
    },
  });

  assert.deepEqual(result.downloads, ['ethereal-silhouette-2hadg-lummi.json']);
  assert.deepEqual(JSON.parse(result.fetchCalls[0].init.body), {
    params: [{ slug: 'ethereal-silhouette-2hadg' }],
  });
});

test('illustration favorite downloads its JSON sidecar', async () => {
  const result = await runFavoriteClick({
    html: `
      <div class="group/item">
        <a href="/illustration/abstract-human-profile-zd35q"></a>
        <button data-id="favorite-image-button"><svg></svg></button>
      </div>
    `,
    pageUrl: 'https://www.lummi.ai/creator/ms.designs.0711-fcesu',
    metadata: {
      id: 'dbf747ac-cf43-4f23-a693-253a3450eeeb',
      slug: 'abstract-human-profile-zd35q',
      url: 'https://assets.lummi.ai/assets/original',
    },
  });

  assert.deepEqual(result.downloads, ['abstract-human-profile-zd35q-lummi.json']);
  assert.deepEqual(JSON.parse(result.fetchCalls[0].init.body), {
    params: [{ slug: 'abstract-human-profile-zd35q' }],
  });
  assert.equal(
    result.sidecars[0].sourceUrl,
    'https://www.lummi.ai/illustration/abstract-human-profile-zd35q'
  );
});

test('detail favorite supports the current illustration route', async () => {
  const result = await runFavoriteClick({
    html: '<button data-id="favorite-image-button"><svg></svg></button>',
    pageUrl: 'https://www.lummi.ai/illustration/abstract-motion-art-nq8cj',
    metadata: {
      id: '99870f19-3c4d-4cb8-86c3-099f18ab2915',
      slug: 'abstract-motion-art-nq8cj',
      url: 'https://assets.lummi.ai/assets/original',
    },
  });

  assert.deepEqual(result.downloads, ['abstract-motion-art-nq8cj-lummi.json']);
  assert.deepEqual(JSON.parse(result.fetchCalls[0].init.body), {
    params: [{ slug: 'abstract-motion-art-nq8cj' }],
  });
});

test('detail favorite supports the current 3d route', async () => {
  const result = await runFavoriteClick({
    html: '<button data-id="favorite-image-button"><svg></svg></button>',
    pageUrl: 'https://www.lummi.ai/3d/surreal-flowing-fabric-wlplu',
    metadata: {
      id: 'ad4c749f-7878-4d65-b279-5de1402b0cb2',
      slug: 'surreal-flowing-fabric-wlplu',
      url: 'https://assets.lummi.ai/assets/original',
    },
  });

  assert.deepEqual(result.downloads, ['surreal-flowing-fabric-wlplu-lummi.json']);
  assert.deepEqual(JSON.parse(result.fetchCalls[0].init.body), {
    params: [{ slug: 'surreal-flowing-fabric-wlplu' }],
  });
  assert.equal(
    result.sidecars[0].sourceUrl,
    'https://www.lummi.ai/3d/surreal-flowing-fabric-wlplu'
  );
});
