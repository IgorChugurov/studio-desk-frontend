'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Select } from '../../shared/ui/select';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { copy, LANGUAGE_CHOICES, type Lang } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';

const settingsSchema = z.object({
  language: z.enum(['en', 'sk', 'uk']),
  country: z.string(),
  currency: z.string(),
  timeZone: z.string(),
});
type Settings = z.infer<typeof settingsSchema>;

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

/** Studio settings: four selects. Save sends only what changed. */
export function SettingsForm() {
  const session = useSession();
  const language: Lang =
    session.status === 'signed-in' ? session.language : 'en';
  const texts = copy(language);
  useCrumbs([{ label: texts.studioSettings }]);

  const [loaded, setLoaded] = useState<Settings | null>(null);
  const [values, setValues] = useState<Settings | null>(null);
  const [options, setOptions] = useState<z.infer<typeof optionsSchema> | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let gone = false;
    void (async () => {
      try {
        const [settings, lists] = await Promise.all([
          getApi().request<unknown>('/settings'),
          getApi().request<unknown>('/settings/options'),
        ]);
        if (gone) return;
        const next = settingsSchema.parse(settings);
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

  const changed =
    values.language !== loaded.language ||
    values.country !== loaded.country ||
    values.currency !== loaded.currency ||
    values.timeZone !== loaded.timeZone;

  async function save() {
    if (!values || !loaded || pending || !changed) return;
    const body: Partial<Settings> = {};
    if (values.language !== loaded.language) body.language = values.language;
    if (values.country !== loaded.country) body.country = values.country;
    if (values.currency !== loaded.currency) body.currency = values.currency;
    if (values.timeZone !== loaded.timeZone) body.timeZone = values.timeZone;
    setPending(true);
    try {
      const saved = settingsSchema.parse(
        await getApi().request('/settings', { method: 'PATCH', body }),
      );
      setLoaded(saved);
      setValues(saved);
      notify.success(texts.settingsSaved);
    } catch (error) {
      if (!(error instanceof ApiError)) notify.error(texts.somethingWentWrong);
      else notify.error(texts.somethingWentWrong);
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
      <div className="flex max-w-xl flex-col gap-[var(--space-400)]">
        <Field id="language" label={texts.language} required>
          <Select
            id="language"
            value={values.language}
            onValueChange={(language) =>
              setValues({
                ...values,
                language: language as Settings['language'],
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
    </form>
  );
}
