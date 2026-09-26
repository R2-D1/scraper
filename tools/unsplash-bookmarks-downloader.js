// ==UserScript==
// @name         Unsplash Auto Download by Bookmark
// @namespace    http://tampermonkey.net/
// @version      2026-08-23.1
// @description  Auto-download an Unsplash asset and its metadata when bookmarking
// @author       You
// @match        https://unsplash.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const photoPathPattern = /^\/(?:photos|illustrations)\/([^/?#]+)(?:[/?#]|$)/;

  // =========================================================
  // METADATA
  // =========================================================

  function getPhotoIdentifier(rawUrl) {
    if (!rawUrl) return null;

    try {
      const url = new URL(rawUrl, location.origin);
      return url.pathname.match(photoPathPattern)?.[1] || null;
    } catch {
      return null;
    }
  }

  function findPhotoIdentifier(btn) {
    const figure = btn.closest(
      'figure[data-testid="asset-grid-masonry-figure"]'
    );

    if (figure) {
      const photoLinks = [
        ...figure.querySelectorAll(
          'a[href^="/photos/"], a[href^="/illustrations/"]'
        )
      ];

      for (const link of photoLinks) {
        const identifier = getPhotoIdentifier(link.href);
        if (identifier) return identifier;
      }
    }

    const currentPageIdentifier = getPhotoIdentifier(location.href);
    if (currentPageIdentifier) return currentPageIdentifier;

    const header =
      btn.closest('header[class*="stickyHeader"]') ||
      btn.closest('header');

    if (header) {
      const links = [
        ...header.querySelectorAll(
          'a[href^="/photos/"], a[href^="/illustrations/"], a[href*="/download"]'
        )
      ];

      for (const link of links) {
        const identifier = getPhotoIdentifier(link.href);
        if (identifier) return identifier;
      }
    }

    return null;
  }

  function safeFilePart(value) {
    return String(value)
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  function downloadJson(value, filename) {
    const blob = new Blob(
      [`${JSON.stringify(value, null, 2)}\n`],
      { type: 'application/json;charset=utf-8' }
    );
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
  }

  async function downloadPhotoMetadata(btn) {
    const identifier = findPhotoIdentifier(btn);

    if (!identifier) {
      console.log('❌ Не вдалося визначити Unsplash ID для metadata');
      return;
    }

    try {
      const response = await fetch(
        `/napi/photos/${encodeURIComponent(identifier)}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5_000)
        }
      );

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const metadata = await response.json();
      const slug = safeFilePart(metadata.slug || metadata.id || identifier);

      if (!slug || !metadata.id || !metadata.links?.html) {
        throw new Error('NAPI повернув неповні metadata');
      }

      const filename = `${slug}-unsplash.json`;
      downloadJson(metadata, filename);
      console.log('✓ METADATA:', filename);
    } catch (error) {
      console.error('❌ METADATA download failed:', error);
    }
  }

  // =========================================================
  // DOWNLOAD
  // =========================================================

  function clickDownloadLink(link) {
    if (!link) {
      console.log('❌ Download link відсутній');
      return;
    }

    console.log('⬇ DOWNLOAD:', link.href);

    // Не створюємо <a download>, а натискаємо штатну кнопку Unsplash.
    link.click();
  }

  // =========================================================
  // POPUP DOWNLOAD
  // =========================================================

  function pickBest(links) {
    const svg =
      links.find(a => a.href.includes('fm=svg')) ||
      links.find(a => /svg/i.test(a.textContent));

    if (svg) return svg;

    const original =
      links.find(a => /original/i.test(a.textContent)) ||
      links.find(a => /original size/i.test(a.textContent));

    if (original) return original;

    const numbered = links
      .map(a => {
        const match = a.href.match(/[?&]w=(\d+)/);

        return match
          ? {
              a,
              width: Number(match[1])
            }
          : null;
      })
      .filter(Boolean);

    if (numbered.length) {
      numbered.sort((a, b) => b.width - a.width);
      return numbered[0].a;
    }

    return links[0];
  }

  async function downloadFromPopup(openBtn) {
    console.log('🔽 Opening download popup');

    openBtn.click();
    await wait(80);

    let popup = null;

    const labelledBySelector = openBtn.id
      ? `[aria-labelledby="${CSS.escape(openBtn.id)}"]`
      : null;

    // Popup Unsplash може рендеритись portal-ом в іншому місці DOM.
    for (let i = 0; i < 100; i++) {
      popup =
        (
          labelledBySelector &&
          document.querySelector(
            `[role="menu"]${labelledBySelector}`
          )
        ) ||
        document.querySelector('[role="menu"][data-open]') ||
        document.querySelector('[role="menu"]');

      if (popup) break;
      await wait(20);
    }

    if (!popup) {
      console.log('❌ Download popup не знайдено');
      return;
    }

    const links = [
      ...popup.querySelectorAll(
        'a[href*="/download"], a[href*="images.unsplash.com"]'
      )
    ];

    if (!links.length) {
      console.log('❌ У popup немає download links');
      return;
    }

    const best = pickBest(links);

    if (!best) {
      console.log('❌ Не вдалося вибрати download option');
      return;
    }

    console.log('➡ POPUP best:', best.href);
    clickDownloadLink(best);

    await wait(100);

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      })
    );
  }

  // =========================================================
  // GRID
  // =========================================================

  async function handleGrid(btn) {
    const figure = btn.closest(
      'figure[data-testid="asset-grid-masonry-figure"]'
    );

    if (!figure) return false;

    console.log('📦 GRID');

    const direct =
      figure.querySelector(
        'a[data-testid="non-sponsored-photo-download-button"]'
      ) ||
      figure.querySelector(
        'a[aria-label="Download"][href*="/download"]'
      ) ||
      figure.querySelector('a[href*="/download?force=true"]');

    if (direct) {
      console.log('➡ GRID direct:', direct.href);
      clickDownloadLink(direct);
      return true;
    }

    const popupBtn =
      figure.querySelector(
        'button[aria-label="Choose download size"]'
      ) ||
      figure.querySelector(
        'button[aria-label="Choose download format"]'
      );

    if (popupBtn) {
      console.log('➡ GRID popup');
      await downloadFromPopup(popupBtn);
      return true;
    }

    console.log('❌ GRID: download не знайдено');
    return true;
  }

  // =========================================================
  // MODAL / PHOTO VIEW
  // =========================================================

  async function handleModal(btn) {
    const header =
      btn.closest('header[class*="stickyHeader"]') ||
      btn.closest('header');

    if (!header) return false;

    console.log('🖼 MODAL');

    const direct =
      header.querySelector(
        'a[data-testid="non-sponsored-photo-download-button"]'
      ) ||
      header.querySelector('a[href*="/download?force=true"]') ||
      header.querySelector('a[href*="/download"]');

    if (direct) {
      console.log('➡ MODAL direct:', direct.href);
      clickDownloadLink(direct);
      return true;
    }

    const buttonsContainer =
      header.querySelector('[class*="photoButtonsContainer"]') ||
      header.querySelector('[class*="downloadButtonContainer"]');

    if (buttonsContainer) {
      console.log('🔎 MODAL photoButtonsContainer found');

      const directInside =
        buttonsContainer.querySelector(
          'a[data-testid="non-sponsored-photo-download-button"]'
        ) ||
        buttonsContainer.querySelector('a[href*="/download"]');

      if (directInside) {
        console.log('➡ MODAL container direct:', directInside.href);
        clickDownloadLink(directInside);
        return true;
      }

      const popupBtn =
        buttonsContainer.querySelector(
          'button[aria-label="Choose download size"]'
        ) ||
        buttonsContainer.querySelector(
          'button[aria-label="Choose download format"]'
        );

      if (popupBtn) {
        console.log('➡ MODAL popup');
        await downloadFromPopup(popupBtn);
        return true;
      }
    }

    const popupBtn =
      header.querySelector(
        'button[aria-label="Choose download size"]'
      ) ||
      header.querySelector(
        'button[aria-label="Choose download format"]'
      );

    if (popupBtn) {
      console.log('➡ MODAL header popup');
      await downloadFromPopup(popupBtn);
      return true;
    }

    console.log('❌ MODAL: download не знайдено');
    return true;
  }

  // =========================================================
  // BOOKMARK
  // =========================================================

  async function handleBookmarkClick(btn) {
    await wait(40);

    // Metadata failure не повинна ламати штатне завантаження asset.
    await downloadPhotoMetadata(btn);

    const gridHandled = await handleGrid(btn);
    if (gridHandled) return;

    const modalHandled = await handleModal(btn);
    if (modalHandled) return;

    console.log('❌ Не вдалося визначити GRID або MODAL');
  }

  // =========================================================
  // LISTENER
  // =========================================================

  document.addEventListener(
    'click',
    event => {
      const btn = event.target.closest(
        'button[aria-label="Bookmark"]'
      );

      if (!btn) return;

      console.log('🔖 Bookmark clicked');
      void handleBookmarkClick(btn);
    },
    true
  );

  console.log(
    '✓ Unsplash Auto Download by Bookmark v2026-08-23.1 loaded'
  );
})();
