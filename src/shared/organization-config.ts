/** Shared shapes of a preset and of an organization's copied configuration. */

export const SECTION_ORDER = [
  'schedule',
  'catalogs',
  'clients',
  'subscriptions',
  'accounting',
  'organization-settings',
  'staff',
] as const;

export type SectionId = (typeof SECTION_ORDER)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  schedule: 'Schedule',
  catalogs: 'Catalogs',
  clients: 'Clients and bookings',
  subscriptions: 'Subscriptions',
  accounting: 'Accounting and reports',
  'organization-settings': 'Organization settings',
  staff: 'Staff',
};

export const SLOT_STATUSES = [
  'planned',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;

export type SlotStatus = (typeof SLOT_STATUSES)[number];

export const LOCKED_SLOT_STATUSES = ['planned', 'cancelled'] as const;

export const SETTLEMENT_MODES = [
  'subscription',
  'direct_check',
  'external_order',
] as const;

export type SettlementMode = (typeof SETTLEMENT_MODES)[number];

export const RESOURCE_ROLES = ['place', 'resource', 'offering'] as const;
export type ResourceRole = (typeof RESOURCE_ROLES)[number];

export const CONFLICT_MODES = ['strict', 'warning', 'none'] as const;
export type ConflictMode = (typeof CONFLICT_MODES)[number];

export type InterfaceLang = 'en' | 'sk' | 'uk';

export interface LocalizedLabels {
  en: { singular: string; plural: string };
  sk: { singular: string; plural: string };
  uk: { singular: string; plural: string };
}

export interface ResourceTypeDraft {
  clientId: string;
  id?: string;
  key?: string;
  role: ResourceRole;
  labels: LocalizedLabels;
  geography: boolean;
  duration: boolean;
  showcase: boolean;
  person: boolean;
  skills: boolean;
  required: boolean;
  multiple: boolean;
  conflictMode: ConflictMode;
}

export interface ScheduleDraft {
  audienceEnabled: boolean;
  formatEnabled: boolean;
  statuses: string[];
}

export interface BillingDraft {
  settlementMode: SettlementMode;
}

export function emptyLabels(): LocalizedLabels {
  return {
    en: { singular: '', plural: '' },
    sk: { singular: '', plural: '' },
    uk: { singular: '', plural: '' },
  };
}

let draftSeq = 0;

export function nextClientId(): string {
  draftSeq += 1;
  return `draft-${draftSeq}`;
}

/** Role locks from the canon. The card stays valid after every edit. */
export function lockResourceType(draft: ResourceTypeDraft): ResourceTypeDraft {
  if (draft.role === 'place') {
    return {
      ...draft,
      geography: true,
      duration: false,
      person: false,
      required: true,
      multiple: false,
    };
  }
  if (draft.role === 'offering') {
    return {
      ...draft,
      geography: false,
      duration: true,
      person: false,
      conflictMode: 'none',
    };
  }
  return { ...draft, geography: false, duration: false };
}

export function placeDraft(key?: string): ResourceTypeDraft {
  return lockResourceType({
    clientId: nextClientId(),
    key,
    role: 'place',
    labels: emptyLabels(),
    geography: true,
    duration: false,
    showcase: false,
    person: false,
    skills: false,
    required: true,
    multiple: false,
    conflictMode: 'strict',
  });
}

export function addedDraft(
  role: 'resource' | 'offering',
  key?: string,
): ResourceTypeDraft {
  return lockResourceType({
    clientId: nextClientId(),
    key,
    role,
    labels: emptyLabels(),
    geography: false,
    duration: role === 'offering',
    showcase: false,
    person: false,
    skills: false,
    required: false,
    multiple: false,
    conflictMode: role === 'offering' ? 'none' : 'strict',
  });
}

export function labelsComplete(types: ResourceTypeDraft[]): boolean {
  return types.every((type) =>
    (['en', 'sk', 'uk'] as const).every((language) => {
      const pair = type.labels[language];
      return pair.singular.trim() !== '' && pair.plural.trim() !== '';
    }),
  );
}

export function withLockedStatuses(selected: readonly string[]): SlotStatus[] {
  const present = new Set<string>([...selected, ...LOCKED_SLOT_STATUSES]);
  return SLOT_STATUSES.filter((status) => present.has(status));
}

export function sameSections(
  left: readonly string[],
  right: readonly string[],
) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((section) => rightSet.has(section));
}

export function nextResourceKey(
  role: ResourceRole,
  taken: readonly string[],
): string {
  if (!taken.includes(role)) return role;
  let index = 2;
  while (taken.includes(`${role}-${index}`)) index += 1;
  return `${role}-${index}`;
}
