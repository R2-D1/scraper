import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { optimize, type Config as SvgoConfig, type CustomPlugin, type XastElement } from 'svgo';

// Відображає ключові плагіни й allowlist із сервісу (divnex2)
const LARGE_SVG_BYTES = 8 * 1024 * 1024;

type DomPurifyInstance = ReturnType<typeof DOMPurify>;

const ALLOWED_SMIL_TAGS = ['animate', 'animateMotion', 'animateColor', 'animateTransform', 'set', 'mpath', 'use'];
const ALLOWED_SMIL_ATTRS = [
  'dur',
  'repeatCount',
  'repeatDur',
  'keyTimes',
  'keySplines',
  'keyPoints',
  'from',
  'to',
  'by',
  'attributeName',
  'calcMode',
  'fill',
  'begin',
  'end',
  'values',
  'path',
  'restart',
  'xlink:href',
  'href',
];

// ===== Колірний нормалізатор (аналог apps/api/src/app/media/svg/color-normalizer.ts)
const HEX_TRIPLE = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_FUNCTION = /^rgba?\(/i;
const IGNORED_COLOR_VALUES = new Set(['none', 'inherit', 'currentcolor']);

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeHexValue(raw: string): string {
  const hex = raw.replace(/^#/, '').toLowerCase();
  if (hex.length === 3 || hex.length === 4) {
    const expanded = hex
      .split('')
      .map(char => char + char)
      .join('');
    if (expanded.length === 8 && expanded.endsWith('ff')) {
      return `#${expanded.slice(0, 6)}`;
    }
    return `#${expanded}`;
  }
  if (hex.length === 6) {
    return `#${hex}`;
  }
  if (hex.length === 8 && hex.endsWith('ff')) {
    return `#${hex.slice(0, 6)}`;
  }
  return `#${hex}`;
}

function parseAlphaComponent(value: string): number | null {
  const percentMatch = value.match(/^([0-9]+(?:\.[0-9]+)?)%$/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    if (!Number.isFinite(percent)) {
      return null;
    }
    return clamp(percent / 100, 0, 1);
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (numeric <= 0) {
    return 0;
  }
  if (numeric >= 1) {
    return 1;
  }
  return numeric;
}

function parseColorComponent(value: string): number | null {
  const percentMatch = value.match(/^([0-9]+(?:\.[0-9]+)?)%$/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    if (!Number.isFinite(percent)) {
      return null;
    }
    return clamp(Math.round((percent / 100) * 255), 0, 255);
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return clamp(Math.round(numeric), 0, 255);
}

function rgbToHex(r: number, g: number, b: number, a: number): string {
  const toComponent = (value: number) =>
    clamp(Math.round(value), 0, 255)
      .toString(16)
      .padStart(2, '0');
  const base = `#${toComponent(r)}${toComponent(g)}${toComponent(b)}`;
  if (a >= 1) {
    return base;
  }
  const alphaComponent = toComponent(Math.round(clamp(a, 0, 1) * 255));
  if (alphaComponent.toLowerCase() === 'ff') {
    return base;
  }
  return `${base}${alphaComponent}`;
}

function parseRgbString(raw: string): { r: number; g: number; b: number; a: number } | null {
  const parts = raw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) {
    return null;
  }
  const [rRaw, gRaw, bRaw, aRaw] = parts;
  const r = parseColorComponent(rRaw);
  const g = parseColorComponent(gRaw);
  const b = parseColorComponent(bRaw);
  if (r === null || g === null || b === null) {
    return null;
  }
  const a = parts.length === 4 ? parseAlphaComponent(aRaw ?? '1') ?? 1 : 1;
  return { r, g, b, a };
}

function normalizeSvgColor(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (IGNORED_COLOR_VALUES.has(lower)) {
    return null;
  }
  if (lower.startsWith('url(') || lower.startsWith('var(')) {
    return null;
  }
  if (lower === 'transparent') {
    return '#00000000';
  }
  if (HEX_TRIPLE.test(trimmed)) {
    const match = trimmed.match(HEX_TRIPLE);
    return match ? normalizeHexValue(match[1]) : null;
  }
  if (RGB_FUNCTION.test(trimmed)) {
    const start = trimmed.indexOf('(');
    const end = trimmed.lastIndexOf(')');
    if (start === -1 || end <= start) {
      return null;
    }
    const tuple = parseRgbString(trimmed.slice(start + 1, end));
    return tuple ? rgbToHex(tuple.r, tuple.g, tuple.b, tuple.a) : null;
  }
  return null;
}

// ===== DomPurify (аналог SAFE_SVG_ANIMATION_* у сервісі)
function createSanitizer(): DomPurifyInstance {
  const window = new JSDOM('').window as unknown as any;
  return DOMPurify(window);
}

const sanitizer = createSanitizer();

export function sanitizeSvg(source: string): string {
  return sanitizer.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script'],
    ADD_TAGS: ALLOWED_SMIL_TAGS,
    ADD_ATTR: ALLOWED_SMIL_ATTRS,
  });
}

// ===== SVGO (аналог SVGO_OPTIMIZATION_CONFIG + buildLargeSvgOptimizationConfig)
const expandCurrentColorPlugin: CustomPlugin<{ fallbackColor?: string }> = {
  name: 'expandCurrentColor',
  params: { fallbackColor: '#000000' },
  fn: (_root, params) => {
    const fallbackColor = normalizeSvgColor(params?.fallbackColor ?? '#000000') ?? '#000000';
    const fallbackContext = { value: fallbackColor, source: 'fallback' as const };
    const stack: Array<{ value: string | null; source: 'explicit' | 'fallback' }> = [];

    const parseStyle = (value: string): Map<string, string> => {
      const map = new Map<string, string>();
      value
        .split(';')
        .map(chunk => chunk.trim())
        .filter(Boolean)
        .forEach(part => {
          const idx = part.indexOf(':');
          if (idx === -1) return;
          const key = part.slice(0, idx).trim().toLowerCase();
          const val = part.slice(idx + 1).trim();
          if (key && val) {
            map.set(key, val);
          }
        });
      return map;
    };

    const serializeStyle = (map: Map<string, string>): string =>
      Array.from(map.entries())
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');

    const colorAttrs = ['fill', 'stroke', 'stop-color'] as const;

    const isCurrentColor = (val?: string | null): boolean =>
      typeof val === 'string' && val.trim().toLowerCase() === 'currentcolor';

    const resolveContext = (
      node: XastElement,
      parent: { value: string | null; source: 'explicit' | 'fallback' }
    ) => {
      const attrColor = normalizeSvgColor(node.attributes?.color ?? null);
      if (attrColor) {
        node.attributes.color = attrColor;
        return { value: attrColor, source: 'explicit' as const };
      }

      const styleVal = node.attributes?.style;
      if (styleVal) {
        const declarations = parseStyle(styleVal);
        const styleColor = normalizeSvgColor(declarations.get('color') ?? null);
        if (styleColor) {
          declarations.set('color', styleColor);
          node.attributes.style = serializeStyle(declarations);
          return { value: styleColor, source: 'explicit' as const };
        }
      }

      if (parent.value) {
        return parent;
      }
      return fallbackContext;
    };

    return {
      element: {
        enter: node => {
          const parent = stack[stack.length - 1] ?? fallbackContext;
          const ctx = resolveContext(node, parent);
          const resolved = ctx.value;

          if (resolved) {
            colorAttrs.forEach(attr => {
              const val = node.attributes?.[attr];
              if (isCurrentColor(val)) {
                node.attributes[attr] = resolved;
              }
            });

            if (node.attributes?.style) {
              const declarations = parseStyle(node.attributes.style);
              let mutated = false;
              colorAttrs.forEach(attr => {
                const val = declarations.get(attr);
                if (isCurrentColor(val)) {
                  declarations.set(attr, resolved);
                  mutated = true;
                }
              });
              const styleColor = declarations.get('color');
              if (isCurrentColor(styleColor)) {
                declarations.set('color', resolved);
                mutated = true;
              }
              if (mutated) {
                const serialized = serializeStyle(declarations);
                if (serialized.length) {
                  node.attributes.style = serialized;
                } else {
                  delete node.attributes.style;
                }
              }
            }
          }

          stack.push(ctx);
        },
        exit: () => {
          stack.pop();
        },
      },
    };
  },
};

function getCommonSvgoConfig(): SvgoConfig {
  return {
    multipass: true,
    js2svg: { pretty: false },
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupIds: false,
            convertColors: false,
            inlineStyles: false,
            removeUnknownsAndDefaults: false,
            removeUselessStrokeAndFill: false,
            removeHiddenElems: false,
            collapseGroups: false,
            moveGroupAttrsToElems: false,
            moveElemsAttrsToGroup: false,
            convertPathData: false,
            convertShapeToPath: false,
            convertTransform: false,
          },
        },
      } as any,
      { name: 'removeViewBox', active: false } as any,
      expandCurrentColorPlugin as any,
      {
        name: 'convertColors',
        params: {
          currentColor: false,
          names2hex: true,
          rgb2hex: true,
          convertCase: 'lower',
          shorthex: false,
          shortname: false,
        },
      } as any,
      { name: 'removeDimensions' } as any,
      {
        name: 'sortAttrs',
        params: { xmlnsOrder: 'alphabetical' },
      } as any,
    ],
  };
}

function getLargeSvgoConfig(): SvgoConfig {
  return {
    multipass: false,
    floatPrecision: 2,
    plugins: [
      'removeDoctype' as any,
      'removeXMLProcInst' as any,
      'removeComments' as any,
      'removeMetadata' as any,
      'removeEditorsNSData' as any,
      { name: 'removeHiddenElems', params: { displayNone: true } } as any,
      'removeEmptyText' as any,
      'removeEmptyAttrs' as any,
      'removeEmptyContainers' as any,
      'removeUnusedNS' as any,
      {
        name: 'removeUnknownsAndDefaults',
        params: { keepAriaAttrs: true },
      } as any,
      { name: 'removeScriptElement' } as any,
    ],
  };
}

export function optimizeSvg(svg: string, sizeBytes: number): string {
  const config = sizeBytes > LARGE_SVG_BYTES ? getLargeSvgoConfig() : getCommonSvgoConfig();
  const result = optimize(svg, config);
  if ('data' in result) {
    return result.data;
  }
  throw new Error('SVGO не повернув оптимізований SVG.');
}

// ===== Нормалізація розміру іконок (аналог enforceSvgDimensions)
function setOrAddAttribute(tag: string, name: string, value: string): string {
  const regex = new RegExp(`\\b${name}\\s*=\\s*(['\"]).*?\\1`, 'i');
  if (regex.test(tag)) {
    return tag.replace(regex, `${name}="${value}"`);
  }
  const insertPos = tag.indexOf(' ');
  if (insertPos === -1) {
    return tag;
  }
  return `${tag.slice(0, insertPos)} ${name}="${value}"${tag.slice(insertPos)}`;
}

export function normalizeIconSvg(svg: string): string {
  const match = svg.match(/<svg\b[^>]*>/i);
  if (!match) {
    return svg.trim() + '\n';
  }
  let svgTag = match[0];
  const viewBoxMatch = svgTag.match(/\bviewBox\s*=\s*(['"])([^'"]+)\1/i);
  const existingViewBox = viewBoxMatch?.[2]?.trim();
  const viewBox = existingViewBox?.length ? existingViewBox : '0 0 200 200';

  svgTag = setOrAddAttribute(svgTag, 'width', '200');
  svgTag = setOrAddAttribute(svgTag, 'height', '200');
  svgTag = setOrAddAttribute(svgTag, 'viewBox', viewBox);

  const normalized = svg.replace(match[0], svgTag);
  return normalized.trim() + '\n';
}
