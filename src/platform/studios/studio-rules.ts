import { z } from 'zod';

/** The platform domain: studios live at `{subdomain}.{PLATFORM_DOMAIN}`. */
export const PLATFORM_DOMAIN = 'studio-desk.axondigital.xyz';

/** Texts of the field errors (`overview.md`, flow 3). */
export const FIELD_TEXTS = {
  name: 'Use 2–100 characters',
  subdomain:
    'Use 3–20 lowercase letters, digits or hyphens, starting with a letter',
  subdomainTaken: 'This subdomain is already taken',
  subdomainReserved: 'This subdomain is reserved',
  customDomain: 'Enter a valid domain, for example yogaspace.com',
  customDomainTaken: 'This domain is already used by another studio',
  ownerEmail: 'Enter a valid e-mail address',
} as const;

export type FieldName = 'name' | 'subdomain' | 'customDomain' | 'ownerEmail';
export type FieldErrors = Partial<Record<FieldName, string>>;

/** What the form edits. All values are plain text. */
export interface StudioValues {
  name: string;
  subdomain: string;
  customDomain: string;
  ownerEmail: string;
}

export const EMPTY_VALUES: StudioValues = {
  name: '',
  subdomain: '',
  customDomain: '',
  ownerEmail: '',
};

/** Trim and lowercase, as the API does before it checks the formats. */
export function normalize(values: StudioValues): StudioValues {
  return {
    name: values.name.trim(),
    subdomain: values.subdomain.trim().toLowerCase(),
    customDomain: values.customDomain.trim().toLowerCase(),
    ownerEmail: values.ownerEmail.trim().toLowerCase(),
  };
}

function isCustomDomain(value: string): boolean {
  if (value.length > 253 || value.includes('://')) return false;
  if (value === PLATFORM_DOMAIN || value.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return false;
  }
  const labels = value.split('.');
  if (labels.length < 2) return false;
  return labels.every((label) =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
  );
}

const emailSchema = z.email();

/** Early feedback only; the API decides (`frontend-brief.md`, invariant 8). */
export function validate(values: StudioValues): FieldErrors {
  const v = normalize(values);
  const errors: FieldErrors = {};
  if (v.name.length < 2 || v.name.length > 100) errors.name = FIELD_TEXTS.name;
  if (!/^[a-z][a-z0-9-]{1,18}[a-z0-9]$/.test(v.subdomain)) {
    errors.subdomain = FIELD_TEXTS.subdomain;
  }
  if (v.customDomain !== '' && !isCustomDomain(v.customDomain)) {
    errors.customDomain = FIELD_TEXTS.customDomain;
  }
  if (!emailSchema.safeParse(v.ownerEmail).success) {
    errors.ownerEmail = FIELD_TEXTS.ownerEmail;
  }
  return errors;
}

const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  ы: 'y',
  э: 'e',
  ъ: '',
  ё: 'e',
};

/**
 * A subdomain proposed from the studio name: Cyrillic is transliterated,
 * accents are dropped, everything else becomes hyphens. The result is cut to
 * 20 characters and starts with a letter. It may still be too short; the form
 * then shows the format error.
 */
export function proposeSubdomain(name: string): string {
  const latin = name
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  return latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z]+/, '')
    .slice(0, 20)
    .replace(/-+$/, '');
}

/** The lines of the "Confirm changes" window for what changed. */
export function changeWarnings(
  before: StudioValues,
  after: StudioValues,
): string[] {
  const a = normalize(before);
  const b = normalize(after);
  const lines: string[] = [];
  if (a.subdomain !== b.subdomain || a.customDomain !== b.customDomain) {
    lines.push('The old address will stop opening the studio site');
  }
  if (a.ownerEmail !== b.ownerEmail) {
    lines.push(
      `The current owner ${a.ownerEmail} will lose access immediately. The new owner will sign in with ${b.ownerEmail}`,
    );
  }
  return lines;
}

/** Only the changed fields, as the update request sends them. */
export function changedBody(
  before: StudioValues,
  after: StudioValues,
): Record<string, unknown> {
  const a = normalize(before);
  const b = normalize(after);
  const body: Record<string, unknown> = {};
  if (a.name !== b.name) body.name = b.name;
  if (a.subdomain !== b.subdomain) body.subdomain = b.subdomain;
  if (a.customDomain !== b.customDomain) {
    body.customDomain = b.customDomain === '' ? null : b.customDomain;
  }
  if (a.ownerEmail !== b.ownerEmail) body.owner = { email: b.ownerEmail };
  return body;
}

export function hasChanges(before: StudioValues, after: StudioValues) {
  return Object.keys(changedBody(before, after)).length > 0;
}

/** The body of the create request. */
export function createBody(values: StudioValues) {
  const v = normalize(values);
  return {
    name: v.name,
    subdomain: v.subdomain,
    customDomain: v.customDomain === '' ? null : v.customDomain,
    owner: { email: v.ownerEmail },
  };
}

/** The address a studio gets, shown under the subdomain field. */
export function studioAddress(subdomain: string): string {
  return `${subdomain.trim().toLowerCase()}.${PLATFORM_DOMAIN}`;
}
