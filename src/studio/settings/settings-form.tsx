'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { ResourceTypeCards } from '../../shared/config-editor/resource-type-cards';
import { ScheduleBillingFields } from '../../shared/config-editor/schedule-billing';
import { configEditorTexts } from '../../shared/config-editor/texts';
import {
  addedDraft,
  labelsComplete,
  lockResourceType,
  nextResourceKey,
  withLockedStatuses,
  type BillingDraft,
  type ResourceTypeDraft,
  type ScheduleDraft,
} from '../../shared/organization-config';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Select } from '../../shared/ui/select';
import { notify } from '../../shared/ui/toaster';
import { getApi } from '../api/api';
import { organizationConfigSchema } from '../api/auth-types';
import { useSession } from '../api/session-provider';
import { copy, LANGUAGE_CHOICES, type Lang } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';

const settingsSchema = z
  .object({
    language: z.enum(['en', 'sk', 'uk']),
    country: z.string(),
    currency: z.string(),
    timeZone: z.string(),
  })
  .and(organizationConfigSchema);

type Settings = z.infer<typeof settingsSchema>;

interface Draft {
  language: Settings['language'];
  country: string;
  currency: string;
  timeZone: string;
  schedule: ScheduleDraft;
  billing: BillingDraft;
  resourceTypes: ResourceTypeDraft[];
}

const optionsSchema = z.object({
  countries: z.array(z.string()),
  currencies: z.array(z.string()),
  timeZones: z.array(z.string()),
});

const CURRENCY_NAME: Record<string, Record<Lang, string>> = {
  EUR: { en: 'Euro', sk: 'Euro', uk: 'Євро' },
  UAH: { en: 'Hryvnia', sk: 'Hrivna', uk: 'Гривня' },
  USD: { en: 'US dollar', sk: 'Americký dolár', uk: 'Долар США' },
};

function countryLabel(code: string, language: Lang): string {
  try {
    return (
      new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code
    );
  } catch {
    return code;
  }
}

function currencyLabel(code: string, language: Lang): string {
  const name = CURRENCY_NAME[code]?.[language];
  return name ? `${name} (${code})` : code;
}

function draftOf(settings: Settings): Draft {
  return {
    language: settings.language,
    country: settings.country,
    currency: settings.currency,
    timeZone: settings.timeZone,
    schedule: {
      ...settings.scheduleConfig,
      statuses: withLockedStatuses(settings.scheduleConfig.statuses),
    },
    billing: settings.billingConfig,
    resourceTypes: settings.catalogConfig.resourceTypes.map((type) =>
      lockResourceType({ ...type, clientId: type.id }),
    ),
  };
}

function catalogBody(types: ResourceTypeDraft[]) {
  return {
    resourceTypes: types.map((type) => ({
      ...(type.id ? { id: type.id } : {}),
      role: type.role,
      labels: {
        en: {
          singular: type.labels.en.singular.trim(),
          plural: type.labels.en.plural.trim(),
        },
        sk: {
          singular: type.labels.sk.singular.trim(),
          plural: type.labels.sk.plural.trim(),
        },
        uk: {
          singular: type.labels.uk.singular.trim(),
          plural: type.labels.uk.plural.trim(),
        },
      },
      geography: type.geography,
      duration: type.duration,
      showcase: type.showcase,
      person: type.person,
      skills: type.skills,
      required: type.required,
      multiple: type.multiple,
      conflictMode: type.conflictMode,
    })),
  };
}

/** Organization settings: base fields and the copied modular configuration. */
export function SettingsForm() {
  const session = useSession();
  const language: Lang =
    session.status === 'signed-in' ? session.language : 'en';
  const texts = copy(language);
  const editorTexts = configEditorTexts(language);
  useCrumbs([{ label: texts.studioSettings }]);

  const [loaded, setLoaded] = useState<Draft | null>(null);
  const [values, setValues] = useState<Draft | null>(null);
  const [options, setOptions] = useState<z.infer<typeof optionsSchema> | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    void (async () => {
      try {
        const [settings, lists] = await Promise.all([
          getApi().request<unknown>('/settings'),
          getApi().request<unknown>('/settings/options'),
        ]);
        if (gone) return;
        const next = draftOf(settingsSchema.parse(settings));
        setLoaded(next);
        setValues(next);
        setOptions(optionsSchema.parse(lists));
      } catch {
        if (!gone) notify.error(texts.somethingWentWrong);
      }
    })();
    return () => {
      gone = true;
    };
  }, [texts.somethingWentWrong]);

  if (!values || !loaded || !options) return null;

  const catalog = catalogBody(values.resourceTypes);
  const loadedCatalog = catalogBody(loaded.resourceTypes);
  const schedule = {
    ...values.schedule,
    statuses: withLockedStatuses(values.schedule.statuses),
  };
  const changed =
    values.language !== loaded.language ||
    values.country !== loaded.country ||
    values.currency !== loaded.currency ||
    values.timeZone !== loaded.timeZone ||
    JSON.stringify(schedule) !== JSON.stringify(loaded.schedule) ||
    JSON.stringify(values.billing) !== JSON.stringify(loaded.billing) ||
    JSON.stringify(catalog) !== JSON.stringify(loadedCatalog);

  async function save() {
    if (!values || !loaded || pending || !changed) return;
    if (!labelsComplete(values.resourceTypes)) {
      setLabelError(editorTexts.enterAllLabels);
      return;
    }
    const body: Record<string, unknown> = {};
    if (values.language !== loaded.language) body.language = values.language;
    if (values.country !== loaded.country) body.country = values.country;
    if (values.currency !== loaded.currency) body.currency = values.currency;
    if (values.timeZone !== loaded.timeZone) body.timeZone = values.timeZone;
    if (JSON.stringify(schedule) !== JSON.stringify(loaded.schedule)) {
      body.scheduleConfig = schedule;
    }
    if (JSON.stringify(values.billing) !== JSON.stringify(loaded.billing)) {
      body.billingConfig = values.billing;
    }
    if (JSON.stringify(catalog) !== JSON.stringify(loadedCatalog)) {
      body.catalogConfig = catalog;
    }
    setPending(true);
    try {
      const parsed = settingsSchema.parse(
        await getApi().request('/settings', { method: 'PATCH', body }),
      );
      const saved = draftOf(parsed);
      setLoaded(saved);
      setValues(saved);
      setLabelError(null);
      const current = getApi().session.get();
      if (current.status === 'signed-in') {
        getApi().session.set({
          ...current,
          config: {
            catalogConfig: parsed.catalogConfig,
            scheduleConfig: parsed.scheduleConfig,
            billingConfig: parsed.billingConfig,
          },
        });
      }
      notify.success(texts.settingsSaved);
    } catch {
      notify.error(texts.somethingWentWrong);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-y-auto p-[var(--space-400)] sm:px-[var(--space-600)]"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="mb-[var(--space-400)] flex justify-end">
        <Button
          type="submit"
          variant="cta"
          size="md"
          disabled={!changed}
          loading={pending}
        >
          {texts.save}
        </Button>
      </div>
      <div className="flex max-w-3xl flex-col gap-[var(--space-600)]">
        <div className="flex max-w-xl flex-col gap-[var(--space-400)]">
          <Field id="language" label={texts.language} required>
            <Select
              id="language"
              value={values.language}
              onValueChange={(next) =>
                setValues({
                  ...values,
                  language: next as Settings['language'],
                })
              }
              options={LANGUAGE_CHOICES.map((item) => ({
                value: item.id,
                label: item.label,
              }))}
            />
          </Field>
          <Field id="country" label={texts.country} required>
            <Select
              id="country"
              value={values.country}
              onValueChange={(country) => setValues({ ...values, country })}
              options={options.countries.map((code) => ({
                value: code,
                label: countryLabel(code, language),
              }))}
            />
          </Field>
          <Field id="currency" label={texts.currency} required>
            <Select
              id="currency"
              value={values.currency}
              onValueChange={(currency) => setValues({ ...values, currency })}
              options={options.currencies.map((code) => ({
                value: code,
                label: currencyLabel(code, language),
              }))}
            />
          </Field>
          <Field id="timeZone" label={texts.timeZone} required>
            <Select
              id="timeZone"
              value={values.timeZone}
              onValueChange={(timeZone) => setValues({ ...values, timeZone })}
              options={options.timeZones.map((zone) => ({
                value: zone,
                label: zone,
              }))}
            />
          </Field>
        </div>
        <ScheduleBillingFields
          schedule={values.schedule}
          billing={values.billing}
          texts={editorTexts}
          onSchedule={(next) => setValues({ ...values, schedule: next })}
          onBilling={(billing) => setValues({ ...values, billing })}
        />
        <ResourceTypeCards
          types={values.resourceTypes}
          texts={editorTexts}
          labelError={labelError}
          onChange={(resourceTypes) => {
            setLabelError(null);
            setValues({ ...values, resourceTypes });
          }}
          onAdd={() => {
            const taken = values.resourceTypes.flatMap((type) =>
              type.key ? [type.key] : [],
            );
            setValues({
              ...values,
              resourceTypes: [
                ...values.resourceTypes,
                addedDraft('resource', nextResourceKey('resource', taken)),
              ],
            });
          }}
        />
      </div>
    </form>
  );
}
