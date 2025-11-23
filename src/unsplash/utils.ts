export function sanitizeSegment(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'media'
  );
}

export function extractPhotoSlugFromUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Невалідний URL: "${rawUrl}".`);
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const photosIndex = segments.findIndex(segment => segment === 'photos' || segment === 'photo');
  if (photosIndex === -1 || photosIndex === segments.length - 1) {
    throw new Error('Не вдалося визначити slug фото з URL.');
  }

  const candidate = segments[photosIndex + 1];
  if (!candidate) {
    throw new Error('Не вдалося визначити slug фото з URL.');
  }

  return candidate.split('?')[0];
}

export function getPhotoIdentifierCandidates(rawUrl: string): string[] {
  const slug = extractPhotoSlugFromUrl(rawUrl);
  const candidates = [slug];
  const fallbackMatch =
    slug.match(/([a-zA-Z0-9_-]{11})$/) ??
    (slug.length >= 6 ? slug.match(/([a-zA-Z0-9_-]{6,})$/) : null);
  const fallbackId = fallbackMatch?.[1];
  if (fallbackId && fallbackId !== slug) {
    candidates.push(fallbackId);
  }
  if (!fallbackId) {
    const parts = slug.split('-');
    const lastSegment = parts[parts.length - 1];
    if (lastSegment && lastSegment.length >= 6 && lastSegment !== slug) {
      candidates.push(lastSegment);
    }
  }
  return candidates;
}
