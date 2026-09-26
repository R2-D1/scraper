type ImageNameMetadata = {
  slug?: string;
  i18n?: {
    name?: { en?: string; uk?: string };
    alt?: { en?: string; uk?: string };
  };
};

const TECHNICAL_TOKEN = /^[A-Za-z0-9_-]{8,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_HASH = /^[0-9a-f]{16,64}$/i;
const GENERIC_PROVIDER_NAME = /^(?:unsplash|pexels)\s+(?:photo|image|illustration|video)\s+[-_a-z0-9]+$/i;

function normalizedToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isTechnicalImageName(value: string, slug?: string): boolean {
  const name = value.trim();
  if (UUID.test(name) || HEX_HASH.test(name) || GENERIC_PROVIDER_NAME.test(name)) return true;
  if (!TECHNICAL_TOKEN.test(name)) return false;

  const hasUpper = /[A-Z]/.test(name);
  const hasLower = /[a-z]/.test(name);
  const hasDigit = /\d/.test(name);
  const hasIrregularCapital = name
    .split(/[-_]/)
    .some((segment) => /[A-Z]/.test(segment.slice(1)));
  const slugToken = slug ? normalizedToken(slug) : "";
  const nameToken = normalizedToken(name);
  const matchesProviderToken = Boolean(slugToken && slugToken.endsWith(nameToken));
  return matchesProviderToken && (hasIrregularCapital || /_/.test(name) || (hasDigit && (hasUpper || hasLower)));
}

function isUntranslatedOpaqueSlug(value: string, slug?: string): boolean {
  return Boolean(
    slug &&
      TECHNICAL_TOKEN.test(value) &&
      normalizedToken(value) === normalizedToken(slug) &&
      !/[\s-]/.test(value) &&
      value.length >= 10,
  );
}

export function assertImageDisplayNames(meta: ImageNameMetadata, label?: string): void {
  const slug = meta.slug?.trim();
  const en = meta.i18n?.name?.en?.trim() ?? "";
  const uk = meta.i18n?.name?.uk?.trim() ?? "";
  const prefix = label ?? slug ?? "зображення";

  if (!en || !uk) {
    throw new Error(`${prefix}: назви en та uk є обов'язковими.`);
  }
  if (
    en.localeCompare(uk, undefined, { sensitivity: "accent" }) === 0 &&
    (isTechnicalImageName(uk, slug) || isUntranslatedOpaqueSlug(uk, slug))
  ) {
    throw new Error(`${prefix}: неперекладену технічну назву "${uk}" заборонено додавати до бібліотеки.`);
  }
  if (isTechnicalImageName(en, slug)) {
    throw new Error(`${prefix}: технічний ID "${en}" заборонено використовувати як назву.`);
  }
}
