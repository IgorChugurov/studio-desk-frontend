import {
  SECTION_ORDER as ORDER,
  type SectionId,
} from '../shared/organization-config';

/** Section order from the organization admin canon. */
export const SECTION_ORDER = ORDER;

export type { SectionId };

const PATH: Record<SectionId, string> = {
  schedule: '/schedule',
  catalogs: '/catalogs',
  clients: '/clients',
  subscriptions: '/subscriptions',
  accounting: '/accounting',
  'organization-settings': '/settings',
  staff: '/staff',
};

const FROM_PATH: Record<string, SectionId> = {
  schedule: 'schedule',
  catalogs: 'catalogs',
  clients: 'clients',
  subscriptions: 'subscriptions',
  accounting: 'accounting',
  settings: 'organization-settings',
  staff: 'staff',
};

export function sectionPath(id: SectionId): string {
  return PATH[id];
}

export function sectionFromPath(segment: string): SectionId | null {
  return FROM_PATH[segment] ?? null;
}

/** The first section in canon order that this person can open. */
export function firstSection(sections: readonly string[]): SectionId {
  return SECTION_ORDER.find((id) => sections.includes(id)) ?? 'schedule';
}
