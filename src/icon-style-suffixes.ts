export const ICON_STYLE_SUFFIXES = [
  'outline',
  'outlined',
  'outline-rounded',
  'outline-sharp',
  'round',
  'rounded',
  'sharp',
  'fill',
  'filled',
  'two-tone',
  'two-tone-rounded',
  'two-tone-sharp',
  'two-tone-filled',
  'twotone',
  'two_tone',
];

export function stripIconStyleSuffix(slug: string): string {
  let base = slug;
  let removed = true;

  while (removed) {
    removed = false;
    for (const suffix of ICON_STYLE_SUFFIXES) {
      if (base.endsWith(`-${suffix}`)) {
        base = base.slice(0, -suffix.length - 1);
        removed = true;
        break;
      }
    }
  }

  while (/-\d+$/.test(base) && base.includes('-')) {
    base = base.replace(/-\d+$/, '');
  }

  return base;
}
