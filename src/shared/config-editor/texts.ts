import type {
  ConflictMode,
  ResourceRole,
  SettlementMode,
  SlotStatus,
} from '../organization-config';

/** English labels of the modular configuration editor. Platform admin uses these as-is. */
export interface ConfigEditorTexts {
  scheduleBilling: string;
  audiencePlaces: string;
  formatMode: string;
  statuses: string;
  status: Record<SlotStatus, string>;
  settlementMode: string;
  settlement: Record<SettlementMode, string>;
  catalogResourceTypes: string;
  addResourceType: string;
  role: Record<ResourceRole, string>;
  singular: string;
  plural: string;
  geography: string;
  duration: string;
  showcase: string;
  person: string;
  skills: string;
  requiredOnSlot: string;
  allowMultiple: string;
  conflictRule: string;
  conflict: Record<ConflictMode, string>;
  remove: string;
  enterAllLabels: string;
  roleLabel: string;
}

export const CONFIG_EDITOR_TEXTS: ConfigEditorTexts = {
  scheduleBilling: 'Schedule & Billing configuration',
  audiencePlaces: 'Audience & places (Group / One person)',
  formatMode: 'Format (Offline / Online)',
  statuses: 'Statuses',
  status: {
    planned: 'Planned',
    confirmed: 'Confirmed',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
  },
  settlementMode: 'Settlement mode',
  settlement: {
    subscription: 'Subscription',
    direct_check: 'Direct check',
    external_order: 'External order',
  },
  catalogResourceTypes: 'Catalog resource types',
  addResourceType: 'Add resource type',
  role: {
    place: 'Place (time anchor)',
    resource: 'Resource (specialist / equipment)',
    offering: 'Offering (service / work / class type)',
  },
  singular: 'Singular',
  plural: 'Plural',
  geography: 'Geography',
  duration: 'Duration',
  showcase: 'Showcase',
  person: 'Person',
  skills: 'Skills',
  requiredOnSlot: 'Required on slot',
  allowMultiple: 'Allow multiple per slot',
  conflictRule: 'Conflict rule',
  conflict: {
    strict: 'Strict — block overlap',
    warning: 'Warning — confirm overlap',
    none: 'None',
  },
  remove: 'Remove',
  enterAllLabels: 'Enter all language labels',
  roleLabel: 'Role',
};
