const $ = selector => document.querySelector(selector);
let collections = [];
let active = null;
let items = [];
let groups = [];
let selectedMediaKeys = new Set();
let editingGroupKey = null;
let uncategorizedCounts = { images: 0, illustrations: 0 };
let selectionControls = new Map();
let groupSelectionControls = new Map();

function isUncategorizedView() { return active?.startsWith('__uncategorized:'); }
function activeCategory() { return isUncategorizedView() ? active.split(':')[1] : null; }

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Помилка');
  return data;
}

function card(item) {
  const group = groups.find(candidate => candidate.key === item.relatedGroupKey);
  const selected = selectedMediaKeys.has(item.mediaKey);
  const groupControl = (item.category?.key === 'images' || item.category?.key === 'illustrations')
    ? `<button type="button" class="group-select ${selected ? 'group-select--active' : ''}" data-select-media="${item.mediaKey}" aria-pressed="${selected}" title="${selected ? 'Прибрати з вибраного' : 'Вибрати'}">${selected ? '✓' : '+'}</button>`
    : '';
  const groupBadge = group
    ? `<button type="button" class="group-badge" data-group-edit="${group.key}" title="Редагувати групу">${group.mediaKeys.length} кадрів</button>`
    : '';
  const taggingStatus = item.taggingStatus === 'pending' ? ' · ⚠ Очікує тегів' : '';
  const author = `<a class="author-link" href="${item.authorUrl}" target="_blank" rel="noreferrer">${item.authorName}</a>`;
  const previewClass = item.category?.key === 'illustrations' ? 'media-preview media-preview--illustration' : 'media-preview';
  return `<article class="card ${selected ? 'card--group-selected' : ''}" data-id="${item.id}">${groupControl}${groupBadge}<img class="${previewClass}" loading="lazy" src="${item.thumbnailUrl || item.imageUrl}" alt="${item.name.uk}" onerror="this.src='${item.imageUrl}'"><div class="info"><strong>${item.name.uk}</strong><button type="button" class="media-key-inline-copy" data-media-key="${item.mediaKey}" title="Скопіювати ключ">${item.mediaKey}</button><div class="muted">${item.source} · ${item.pinned ? '📌 pin' : ''}${taggingStatus}</div><div class="muted">Автор: ${author}</div></div></article>`;
}

function groupCard(group) {
  const groupItems = group.mediaKeys.map(key => group.items.find(item => item.mediaKey === key)).filter(Boolean);
  if (!groupItems.length) return '';
  const item = groupItems[0];
  const selected = groupItems.some(candidate => selectedMediaKeys.has(candidate.mediaKey));
  const groupControl = `<button type="button" class="group-select ${selected ? 'group-select--active' : ''}" data-select-group="${group.key}" aria-pressed="${selected}" title="${selected ? 'Прибрати групу з вибраного' : 'Вибрати групу'}">${selected ? '✓' : '+'}</button>`;
  const groupBadge = `<button type="button" class="group-badge" data-group-edit="${group.key}" title="Редагувати групу">${groupItems.length} кадрів</button>`;
  const author = `<a class="author-link" href="${item.authorUrl}" target="_blank" rel="noreferrer">${item.authorName}</a>`;
  return `<article class="card media-group-card ${selected ? 'card--group-selected' : ''}" data-group-card="${group.key}" data-group-index="0" data-id="${item.id}">${groupControl}${groupBadge}<div class="media-slider"><button type="button" class="media-slider__arrow media-slider__arrow--prev" data-slider-prev="${group.key}" aria-label="Попереднє зображення">‹</button><img class="media-slider__image" loading="lazy" src="${item.thumbnailUrl || item.imageUrl}" alt="${item.name.uk}" onerror="this.src='${item.imageUrl}'"><button type="button" class="media-slider__arrow media-slider__arrow--next" data-slider-next="${group.key}" aria-label="Наступне зображення">›</button></div><div class="info"><strong>${item.name.uk}</strong><button type="button" class="media-key-inline-copy" data-media-key="${item.mediaKey}" title="Скопіювати ключ">${item.mediaKey}</button><div class="muted">${item.source} · ${item.pinned ? '📌 pin' : ''} · ${groupItems.length} кадрів</div><div class="muted">Автор: <a class="author-link" href="${item.authorUrl}" target="_blank" rel="noreferrer">${item.authorName}</a></div></div></article>`;
}

function collectionPreview(collection) {
  const previews = (collection.previews || []).slice(0, 3);
  if (!previews.length) return '<div class="empty">Немає preview</div>';
  const image = item => `${item.thumbnailUrl || item.imageUrl}`;
  return `<div class="collection-preview"><img class="collection-preview__main" src="${image(previews[0])}" alt="${collection.name.uk}">${previews.slice(1).map(item => `<img src="${image(item)}" alt="">`).join('')}</div>`;
}

function pexelsStatus(collection) {
  const connected = collection.providerCollections?.some(link => link.provider === 'pexels');
  return connected ? '<span class="provider-status" title="Прив’язано до Pexels">✓</span>' : '';
}

function renderCollections() {
  const groups = [['images', 'Зображення'], ['illustrations', 'Ілюстрації']];
  $('#collections').innerHTML = groups.map(([category, label]) => {
    const group = collections.filter(collection => collection.category === category);
    if (!group.length) return '';
    const uncategorized = uncategorizedCounts[category] > 0 ? `<button class="collection-link ${active === `__uncategorized:${category}` ? 'active' : ''}" data-uncategorized="${category}"><span class="collection-link__name">Без колекції</span><span>${uncategorizedCounts[category]}</span></button>` : '';
    return `<div class="sidebar-group"><h3>${label}</h3>${uncategorized}${group.map(collection => `<button class="collection-link ${active === collection.slug ? 'active' : ''}" data-collection="${collection.slug}"><span class="collection-link__name">${collection.name.uk}${pexelsStatus(collection)}</span><span>${collection.count}</span></button>`).join('')}</div>`;
  }).join('');
  $('#grid').className = 'collection-grid collection-overview';
  $('#grid').innerHTML = collections.map(collection => `<article class="card collection-card" data-collection="${collection.slug}">${collectionPreview(collection)}<span class="badge">${collection.count}</span><div class="info"><strong>${collection.name.uk}</strong><div class="muted">${collection.category === 'illustrations' ? 'Ілюстрації' : 'Зображення'}</div></div></article>`).join('');
  document.querySelectorAll('#collections .collection-link,#grid .collection-card').forEach(element => element.addEventListener('click', () => openCollection(element.dataset.collection)));
  $('#title').textContent = 'Колекції';
  $('#count').textContent = `${collections.length} колекцій`;
  $('#back').hidden = true;
}

function renderItems() {
  $('#grid').className = 'collection-grid';
  const renderedGroups = new Set();
  const sortedItems = [...items].sort((left, right) => {
    const authorFor = item => {
      const group = groups.find(candidate => candidate.key === item.relatedGroupKey);
      const primary = group?.items.find(candidate => candidate.mediaKey === group.primaryMediaKey);
      return (primary || item).authorName || '';
    };
    return authorFor(left).localeCompare(authorFor(right), 'uk', { sensitivity: 'base' })
      || (left.name?.uk || '').localeCompare(right.name?.uk || '', 'uk', { sensitivity: 'base' });
  });
  const cards = sortedItems.map(item => {
    const group = groups.find(candidate => candidate.key === item.relatedGroupKey);
    if (!group || renderedGroups.has(group.key)) return group ? '' : card(item);
    renderedGroups.add(group.key);
    return groupCard(group);
  }).filter(Boolean);
  $('#grid').innerHTML = cards.length ? cards.join('') : '<div class="empty">Нічого не знайдено</div>';
  cacheSelectionControls();
  $('#title').textContent = isUncategorizedView() ? 'Без колекції' : collections.find(collection => collection.slug === active)?.name.uk || 'Зображення';
  $('#count').textContent = `${items.length} елементів`;
  $('#back').hidden = false;
  updateGroupActions();
}

function moveGroupSlider(groupKey, direction) {
  const group = groups.find(candidate => candidate.key === groupKey);
  const cardElement = document.querySelector(`[data-group-card="${groupKey}"]`);
  if (!group || !cardElement) return;
  const groupItems = group.mediaKeys.map(key => group.items.find(item => item.mediaKey === key)).filter(Boolean);
  if (!groupItems.length) return;
  const index = (Number(cardElement.dataset.groupIndex || 0) + direction + groupItems.length) % groupItems.length;
  const item = groupItems[index];
  cardElement.dataset.groupIndex = index;
  cardElement.dataset.id = item.id;
  cardElement.querySelector('.media-slider__image').src = item.thumbnailUrl || item.imageUrl;
  cardElement.querySelector('.media-slider__image').alt = item.name.uk;
  cardElement.querySelector('.media-slider__image').onerror = event => { event.currentTarget.src = item.imageUrl; };
  cardElement.querySelector('.media-key-inline-copy').dataset.mediaKey = item.mediaKey;
  cardElement.querySelector('.media-key-inline-copy').textContent = item.mediaKey;
  cardElement.querySelector('.info strong').textContent = item.name.uk;
  const authorLink = cardElement.querySelector('.author-link');
  authorLink.href = item.authorUrl;
  authorLink.textContent = item.authorName;
  cardElement.querySelectorAll('.muted')[0].textContent = `${item.source} · ${item.pinned ? '📌 pin' : ''} · ${groupItems.length} кадрів`;
}

function selectedItems() {
  const all = [...items, ...groups.flatMap(group => group.items || [])];
  const unique = new Map(all.map(item => [item.mediaKey, item]));
  return [...selectedMediaKeys].map(key => unique.get(key)).filter(Boolean);
}

function updateGroupActions() {
  const count = selectedMediaKeys.size;
  $('#group-actions').hidden = !active || count === 0;
  $('#group-count').textContent = `${count} вибрано`;
  $('#group-save').hidden = count < 2 || count > 10;
  $('#group-save').disabled = count < 2 || count > 10;
  $('#group-save').textContent = editingGroupKey ? 'Оновити групу' : 'Створити групу';
  $('#group-disband').hidden = !editingGroupKey;
  $('#collection-assign').hidden = count === 0;
  $('#collection-assign').textContent = 'Призначити колекції';
}

function cacheSelectionControls() {
  selectionControls = new Map([...document.querySelectorAll('[data-select-media]')].map(button => [button.dataset.selectMedia, button]));
  groupSelectionControls = new Map([...document.querySelectorAll('[data-select-group]')].map(button => [button.dataset.selectGroup, button]));
}

function updateMediaSelectionControl(mediaKey) {
  const button = selectionControls.get(mediaKey);
  if (!button) return;
  const selected = selectedMediaKeys.has(mediaKey);
  button.classList.toggle('group-select--active', selected);
  button.setAttribute('aria-pressed', String(selected));
  button.textContent = selected ? '✓' : '+';
  button.closest('.card')?.classList.toggle('card--group-selected', selected);
}

function updateGroupSelectionControl(groupKey) {
  const button = groupSelectionControls.get(groupKey);
  const group = groups.find(candidate => candidate.key === groupKey);
  if (!button || !group) return;
  const selected = group.mediaKeys.every(key => selectedMediaKeys.has(key));
  button.classList.toggle('group-select--active', selected);
  button.setAttribute('aria-pressed', String(selected));
  button.textContent = selected ? '✓' : '+';
  button.closest('.card')?.classList.toggle('card--group-selected', selected);
}

function syncSelectionStyles(changedMediaKeys = []) {
  for (const mediaKey of changedMediaKeys) {
    updateMediaSelectionControl(mediaKey);
    for (const group of groups) if (group.mediaKeys.includes(mediaKey)) updateGroupSelectionControl(group.key);
  }
  updateGroupActions();
}

function clearGroupSelection() {
  const previous = [...selectedMediaKeys];
  selectedMediaKeys = new Set();
  editingGroupKey = null;
  syncSelectionStyles(previous);
}

function beginEditGroup(groupKey) {
  const group = groups.find(candidate => candidate.key === groupKey);
  if (!group) return;
  editingGroupKey = group.key;
  selectedMediaKeys = new Set(group.mediaKeys);
  renderItems();
}

function toggleSelection(mediaKeys) {
  const next = new Set(selectedMediaKeys);
  const allSelected = mediaKeys.every(key => next.has(key));
  for (const mediaKey of mediaKeys) allSelected ? next.delete(mediaKey) : next.add(mediaKey);
  selectedMediaKeys = next;
  syncSelectionStyles(mediaKeys);
}

async function editSelectedGroup() {
  const groupItems = selectedItems();
  if (groupItems.length < 2 || groupItems.length > 10) return;
  const current = groups.find(group => group.key === editingGroupKey);
  const defaultPrimary = current?.primaryMediaKey || groupItems[0].mediaKey;
  $('#group-editor-body').innerHTML = `<h2>Головне зображення</h2><p class="muted">Воно відкриватиме групову картку першим.</p><div class="group-primary-list">${groupItems.map(item => `<label><input type="radio" name="group-primary" value="${item.mediaKey}" ${item.mediaKey === defaultPrimary ? 'checked' : ''}><img src="${item.thumbnailUrl || item.imageUrl}" alt=""><span>${item.name.uk}</span></label>`).join('')}</div>`;
  const result = await new Promise(resolve => {
    $('#group-editor').returnValue = '';
    $('#group-editor').onclose = () => resolve($('#group-editor').returnValue);
    $('#group-editor').showModal();
  });
  if (result !== 'default') return;
  const primaryMediaKey = $('#group-editor-body input[name="group-primary"]:checked')?.value;
  if (!primaryMediaKey) return alert('Потрібно вибрати головне зображення.');
  try {
    await api('/api/related-image-groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: editingGroupKey, mediaKeys: [...selectedMediaKeys], primaryMediaKey }),
    });
    groups = await api('/api/related-image-groups');
    await openCollection(active);
    clearGroupSelection();
  } catch (error) { alert(error.message); }
}

async function disbandSelectedGroup() {
  if (!editingGroupKey || !confirm('Розформувати цю групу?')) return;
  try {
    await api(`/api/related-image-groups/${encodeURIComponent(editingGroupKey)}`, { method: 'DELETE' });
    groups = await api('/api/related-image-groups');
    await openCollection(active);
    clearGroupSelection();
  } catch (error) { alert(error.message); }
}

async function openCollection(slug) {
  active = slug;
  const params = isUncategorizedView() ? `collection=__uncategorized&category=${encodeURIComponent(activeCategory())}` : `collection=${encodeURIComponent(slug)}`;
  items = await api(`/api/media?${params}&q=${encodeURIComponent($('#search').value)}`);
  renderItems();
  document.querySelectorAll('.collection-link').forEach(button => button.classList.toggle('active', button.dataset.collection === active));
}

async function refreshLibrary(reloadFromDisk = false) {
  if (reloadFromDisk) await api('/api/reload', { method: 'POST' });
  [collections, groups] = await Promise.all([api('/api/collections'), api('/api/related-image-groups')]);
  const [all, uncategorizedImages, uncategorizedIllustrations] = await Promise.all([
    api('/api/media'),
    api('/api/media?collection=__uncategorized&category=images'),
    api('/api/media?collection=__uncategorized&category=illustrations'),
  ]);
  uncategorizedCounts = { images: uncategorizedImages.length, illustrations: uncategorizedIllustrations.length };
  selectedMediaKeys.clear();
  selectionControls.clear();
  groupSelectionControls.clear();
  $('#summary').textContent = `${all.length} елементів у ${collections.length} колекціях`;
  if (active) await openCollection(active); else renderCollections();
}

async function reloadLibrary() {
  const button = $('#reload-library');
  button.disabled = true;
  button.textContent = 'Перечитую…';
  try {
    await refreshLibrary(true);
  } catch (error) {
    alert(`Не вдалося перечитати бібліотеку: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Перечитати бібліотеку';
  }
}

async function assignSelectedCollection() {
  const selected = selectedItems();
  if (!selected.length) return;
  const category = isUncategorizedView() ? activeCategory() : selected[0].category?.key;
  const options = collections.filter(collection => collection.category === category).map(collection => `<label class="bulk-collection-option"><input type="checkbox" value="${collection.slug}">${collection.name.uk}</label>`).join('');
  $('#collection-editor-body').innerHTML = `<strong>Куди призначити</strong><div id="bulk-collections">${options}</div><p class="muted">Буде оновлено зображень: ${selected.length}. Поточна колекція буде замінена вибраними.</p>`;
  $('#collection-editor form .actions button[value="default"]').textContent = 'Призначити';
  $('#collection-editor').returnValue = '';
  const result = await new Promise(resolve => { $('#collection-editor').onclose = () => resolve($('#collection-editor').returnValue); $('#collection-editor').showModal(); });
  if (result !== 'default') return;
  const collectionSlugs = [...$('#collection-editor-body').querySelectorAll('input:checked')].map(input => input.value);
  if (!collectionSlugs.length) return alert('Виберіть щонайменше одну колекцію.');
  try {
    await api('/api/media/bulk-collection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mediaKeys: selected.map(item => item.mediaKey), collectionSlugs, fromCollectionSlug: isUncategorizedView() ? undefined : active }) });
    selectedMediaKeys = new Set();
    collections = await api('/api/collections');
    if (isUncategorizedView()) uncategorizedCounts[category] -= selected.length;
    await openCollection(active);
    renderCollectionsSidebarOnly();
  } catch (error) { alert(error.message); }
}

function renderCollectionsSidebarOnly() {
  const groups = [['images', 'Зображення'], ['illustrations', 'Ілюстрації']];
  $('#collections').innerHTML = groups.map(([category, label]) => {
    const group = collections.filter(collection => collection.category === category);
    if (!group.length) return '';
    const uncategorized = uncategorizedCounts[category] > 0 ? `<button class="collection-link ${active === `__uncategorized:${category}` ? 'active' : ''}" data-uncategorized="${category}"><span class="collection-link__name">Без колекції</span><span>${uncategorizedCounts[category]}</span></button>` : '';
    return `<div class="sidebar-group"><h3>${label}</h3>${uncategorized}${group.map(collection => `<button class="collection-link ${active === collection.slug ? 'active' : ''}" data-collection="${collection.slug}"><span class="collection-link__name">${collection.name.uk}${pexelsStatus(collection)}</span><span>${collection.count}</span></button>`).join('')}</div>`;
  }).join('');
}

async function copyMediaKey(button) {
  const mediaKey = button.dataset.mediaKey;
  await navigator.clipboard.writeText(mediaKey);
  const originalLabel = button.textContent;
  button.textContent = 'Скопійовано';
  setTimeout(() => { button.textContent = originalLabel; }, 1200);
}

async function openEditor(item) {
  const all = collections.filter(collection => collection.category === item.category?.key).map(collection => `<label><input type="checkbox" value="${collection.slug}" ${item.collectionSlugs.includes(collection.slug) ? 'checked' : ''}>${collection.name.uk}</label>`).join('');
  const coverCollection = active && !isUncategorizedView() && item.collectionSlugs.includes(active) ? collections.find(collection => collection.slug === active) : null;
  const tags = (item.tags || []).map(tag => tag.i18n?.uk || tag.i18n?.en || tag.key).filter(Boolean);
  const tagsMarkup = tags.length ? tags.map(tag => `<span>${tag}</span>`).join('') : '<span class="muted">Немає тегів</span>';
  const taggingStatus = item.taggingStatus === 'pending' ? '<div class="muted">Статус тегів: очікує візуального тегування</div>' : '';
  $('#editor-body').innerHTML = `<div class="edit-grid"><img src="${item.imageUrl}" alt=""><button type="button" class="media-key-copy" data-media-key="${item.mediaKey}" title="Скопіювати ключ">${item.mediaKey}</button><div class="tags-edit"><b>Теги</b><div class="tag-list">${tagsMarkup}</div>${taggingStatus}</div><label>Назва EN<input id="en" value="${item.name.en.replaceAll('"', '&quot;')}"></label><label>Назва UK<input id="uk" value="${item.name.uk.replaceAll('"', '&quot;')}"></label><label>Pin<input id="pin" type="checkbox" ${item.pinned ? 'checked' : ''}></label><div class="collections-edit"><b>Колекції</b>${all}</div>${coverCollection ? `<div class="cover-action"><strong>Обкладинка колекції «${coverCollection.name.uk}»</strong><button id="set-cover" type="button">Зробити обкладинкою</button></div>` : ''}<div class="muted">${item.source} / ${item.slug}<br>${item.width || '?'}×${item.height || '?'} · ${item.licenseName || ''}</div></div>`;
  $('#editor-body .media-key-copy').onclick = event => copyMediaKey(event.currentTarget);
  $('#editor-body #set-cover')?.addEventListener('click', async () => {
    try {
      await api(`/api/collections/${encodeURIComponent(coverCollection.slug)}/cover`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mediaKey: item.mediaKey }) });
      collections = await api('/api/collections');
      alert('Обкладинку оновлено.');
    } catch (error) { alert(error.message); }
  });
  $('#delete').onclick = async () => {
    if (!confirm(`Видалити «${item.name.uk}» з локальної бібліотеки та підготувати видалення на серверах?`)) return;
    try {
      await api(`/api/media/${encodeURIComponent(item.source)}/${encodeURIComponent(item.slug)}`, { method: 'DELETE' });
      $('#editor').close();
      if (active) await openCollection(active); else { collections = await api('/api/collections'); renderCollections(); }
    } catch (error) { alert(error.message); }
  };
  const result = await new Promise(resolve => { $('#editor').returnValue = ''; $('#editor').onclose = () => resolve($('#editor').returnValue); $('#editor').showModal(); });
  if (result !== 'default') return;
  const collectionSlugs = [...$('#editor-body').querySelectorAll('.collections-edit input:checked')].map(input => input.value);
  if (!collectionSlugs.length) return alert('Потрібна щонайменше одна колекція.');
  try {
    await api(`/api/media/${encodeURIComponent(item.source)}/${encodeURIComponent(item.slug)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: { en: $('#en').value, uk: $('#uk').value }, pinned: $('#pin').checked, collectionSlugs }) });
    if (active) await openCollection(active); else { collections = await api('/api/collections'); renderCollections(); }
  } catch (error) { alert(error.message); }
}

async function init() {
  await refreshLibrary();
  $('#collections').onclick = event => { const button = event.target.closest('[data-collection],[data-uncategorized]'); if (!button) return; if (button.dataset.uncategorized) return openCollection(`__uncategorized:${button.dataset.uncategorized}`); openCollection(button.dataset.collection); };
  $('#grid').onclick = event => { const previous = event.target.closest('[data-slider-prev]'); if (previous) return moveGroupSlider(previous.dataset.sliderPrev, -1); const next = event.target.closest('[data-slider-next]'); if (next) return moveGroupSlider(next.dataset.sliderNext, 1); const mediaSelect = event.target.closest('[data-select-media]'); if (mediaSelect) return toggleSelection([mediaSelect.dataset.selectMedia]); const groupSelect = event.target.closest('[data-select-group]'); if (groupSelect) { const group = groups.find(candidate => candidate.key === groupSelect.dataset.selectGroup); if (group) return toggleSelection(group.mediaKeys); } const groupEdit = event.target.closest('[data-group-edit]'); if (groupEdit) return beginEditGroup(groupEdit.dataset.groupEdit); const copyButton = event.target.closest('[data-media-key]'); if (copyButton) return copyMediaKey(copyButton); const collection = event.target.closest('[data-collection]'); if (collection) return openCollection(collection.dataset.collection); const item = event.target.closest('[data-id]'); if (item) api(`/api/media/${item.dataset.id.split('/').map(encodeURIComponent).join('/')}`).then(openEditor); };
  $('#back').onclick = () => { active = null; renderCollections(); };
  $('#search').oninput = () => active ? openCollection(active) : renderCollections();
  $('#group-clear').onclick = clearGroupSelection;
  $('#group-save').onclick = editSelectedGroup;
  $('#group-disband').onclick = disbandSelectedGroup;
  $('#collection-assign').onclick = assignSelectedCollection;
  $('#reload-library').onclick = reloadLibrary;
}

init().catch(error => { $('#grid').innerHTML = `<div class="empty">${error.message}</div>`; });
