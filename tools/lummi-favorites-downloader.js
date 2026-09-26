// ==UserScript==
// @name         Lummi Intake Download by Favorite
// @namespace    http://tampermonkey.net/
// @version      2026-09-24.5
// @description  Download Lummi metadata when favoriting an image
// @author       You
// @match        https://www.lummi.ai/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const pendingSlugs = new Set();
  const imagePathPattern = /^\/(photo|illustration|3d)\/([^/?#]+)(?:[/?#]|$)/;

  function getGridCard(button) {
    let element = button.parentElement;

    while (element) {
      if (element.classList?.contains('group/item')) return element;
      element = element.parentElement;
    }

    return null;
  }

  function getImageRoute(button) {
    const card = getGridCard(button);
    const sourceUrl = card
      ? card.querySelector(
          'a[href^="/photo/"], a[href^="/illustration/"], a[href^="/3d/"]'
        )?.href
      : location.href;

    if (!sourceUrl) return null;

    try {
      const match = new URL(sourceUrl, location.origin).pathname.match(
        imagePathPattern
      );

      return match ? { type: match[1], slug: match[2] } : null;
    } catch {
      return null;
    }
  }

  function isAlreadyFavorite(button) {
    return button.classList.contains('opacity-100');
  }

  function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
  }

  function downloadJson(value, filename) {
    downloadBlob(
      new Blob([`${JSON.stringify(value, null, 2)}\n`], {
        type: 'application/json;charset=utf-8'
      }),
      filename
    );
  }

  async function fetchMetadata(slug) {
    const response = await fetch('/api/actions/getImage', {
      method: 'POST',
      body: JSON.stringify({ params: [{ slug }] }),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`Metadata request failed: ${response.status}`);
    }

    const metadata = await response.json();

    if (!metadata?.id || !metadata?.slug || !metadata?.url) {
      throw new Error('Metadata response is incomplete');
    }

    return metadata;
  }

  async function downloadIntake({ type, slug }) {
    if (pendingSlugs.has(slug)) return;
    pendingSlugs.add(slug);

    try {
      const metadata = await fetchMetadata(slug);
      const filenameBase = `${metadata.slug}-lummi`;
      const sidecar = {
        ...metadata,
        sourceName: 'Lummi',
        sourceUrl: `https://www.lummi.ai/${type}/${metadata.slug}`,
        license: {
          name: 'Lummi License',
          url: 'https://www.lummi.ai/license'
        },
        downloadedAt: new Date().toISOString()
      };

      downloadJson(sidecar, `${filenameBase}.json`);
      console.log('✓ LUMMI METADATA:', filenameBase);
    } catch (error) {
      console.error('❌ LUMMI INTAKE download failed:', error);
    } finally {
      pendingSlugs.delete(slug);
    }
  }

  document.addEventListener(
    'click',
    event => {
      const button = event.target.closest(
        'button[data-id="favorite-image-button"]'
      );

      if (!button || isAlreadyFavorite(button)) return;

      const imageRoute = getImageRoute(button);
      if (!imageRoute) {
        console.warn('⚠ LUMMI METADATA: could not resolve image route');
        return;
      }

      void downloadIntake(imageRoute);
    },
    true
  );

  console.log('✓ Lummi Metadata Download by Favorite v2026-09-24.5 loaded');
})();
