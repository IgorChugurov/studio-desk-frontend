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

const CONFIG_EDITOR_TEXTS_SK: ConfigEditorTexts = {
  scheduleBilling: 'Konfigurácia rozvrhu a vyúčtovania',
  audiencePlaces: 'Kapacita (skupina / jedna osoba)',
  formatMode: 'Formát (offline / online)',
  statuses: 'Stavy',
  status: {
    planned: 'Plánované',
    confirmed: 'Potvrdené',
    in_progress: 'Prebieha',
    completed: 'Dokončené',
    cancelled: 'Zrušené',
    no_show: 'Nedostavenie',
  },
  settlementMode: 'Spôsob vyúčtovania',
  settlement: {
    subscription: 'Permanentka',
    direct_check: 'Priama platba',
    external_order: 'Externý doklad',
  },
  catalogResourceTypes: 'Typy zdrojov katalógu',
  addResourceType: 'Pridať typ zdroja',
  role: {
    place: 'Miesto (časová kotva)',
    resource: 'Zdroj (špecialista / vybavenie)',
    offering: 'Služba (práca / typ hodiny)',
  },
  singular: 'Jednotné číslo',
  plural: 'Množné číslo',
  geography: 'Geografia',
  duration: 'Trvanie',
  showcase: 'Vitrína',
  person: 'Osoba',
  skills: 'Zručnosti',
  requiredOnSlot: 'Povinné v slote',
  allowMultiple: 'Viac hodnôt v jednom slote',
  conflictRule: 'Pravidlo prekrývania',
  conflict: {
    strict: 'Prísne — zakázať prekrytie',
    warning: 'Upozornenie — potvrdiť prekrytie',
    none: 'Žiadne',
  },
  remove: 'Odstrániť',
  enterAllLabels: 'Zadajte názvy vo všetkých jazykoch',
  roleLabel: 'Rola',
};

const CONFIG_EDITOR_TEXTS_UK: ConfigEditorTexts = {
  scheduleBilling: 'Налаштування розкладу й розрахунку',
  audiencePlaces: 'Місткість (група / одна особа)',
  formatMode: 'Формат (офлайн / онлайн)',
  statuses: 'Статуси',
  status: {
    planned: 'Заплановано',
    confirmed: 'Підтверджено',
    in_progress: 'Триває',
    completed: 'Завершено',
    cancelled: 'Скасовано',
    no_show: 'Неявка',
  },
  settlementMode: 'Спосіб розрахунку',
  settlement: {
    subscription: 'Абонемент',
    direct_check: 'Прямий чек',
    external_order: 'Зовнішній документ',
  },
  catalogResourceTypes: 'Види ресурсів каталогу',
  addResourceType: 'Додати вид ресурсу',
  role: {
    place: 'Місце (якір часу)',
    resource: 'Ресурс (спеціаліст / обладнання)',
    offering: 'Послуга (робота / вид заняття)',
  },
  singular: 'Однина',
  plural: 'Множина',
  geography: 'Географія',
  duration: 'Тривалість',
  showcase: 'Вітрина',
  person: 'Людина',
  skills: 'Навички',
  requiredOnSlot: 'Обовʼязково в слоті',
  allowMultiple: 'Кілька значень на один слот',
  conflictRule: 'Правило перетину',
  conflict: {
    strict: 'Жорстко — заборонити перетин',
    warning: 'Попередження — підтвердити перетин',
    none: 'Без перевірки',
  },
  remove: 'Видалити',
  enterAllLabels: 'Заповніть назви всіма мовами',
  roleLabel: 'Роль',
};

/** Organization settings follow the signed-in person's interface language. */
export function configEditorTexts(
  language: 'en' | 'sk' | 'uk',
): ConfigEditorTexts {
  if (language === 'sk') return CONFIG_EDITOR_TEXTS_SK;
  if (language === 'uk') return CONFIG_EDITOR_TEXTS_UK;
  return CONFIG_EDITOR_TEXTS;
}
