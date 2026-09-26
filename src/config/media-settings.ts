const parseNumberEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseNumberList = (key: string, fallback: number[]): number[] => {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  const values = raw
    .split(',')
    .map(item => Number(item.trim()))
    .filter(value => Number.isFinite(value) && value > 0)
    .map(value => Math.round(value));
  const unique = Array.from(new Set(values)).sort((a, b) => a - b);
  return unique.length ? unique : fallback;
};

export const mediaSettings = {
  thumbWidth: parseNumberEnv('MEDIA_THUMB_WIDTH', 512),
  thumbQuality: parseNumberEnv('MEDIA_THUMB_QUALITY', 80),
  webpQuality: parseNumberEnv('MEDIA_WEBP_QUALITY', 80),
  variantWidths: parseNumberList('MEDIA_IMAGE_VARIANT_WIDTHS', [512, 1024, 1600, 2400]),
  variantThresholdRatio: parseNumberEnv('MEDIA_IMAGE_VARIANT_THRESHOLD_RATIO', 1.1),
  maxSvgBytes: parseNumberEnv('MEDIA_MAX_SVG_BYTES', 3 * 1024 * 1024),
  minSvgThumbBytes: parseNumberEnv('MEDIA_MIN_SVG_THUMB_BYTES', 200 * 1024),
  thumbSuffix: process.env.MEDIA_THUMB_SUFFIX ?? '_thumb',
};
