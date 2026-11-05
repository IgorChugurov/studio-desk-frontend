import { describe, expect, it } from 'vitest';
import { CONFIG_EDITOR_TEXTS, configEditorTexts } from './texts';

describe('config editor texts', () => {
  it('uses English, Slovak, and Ukrainian in organization settings', () => {
    expect(configEditorTexts('en')).toBe(CONFIG_EDITOR_TEXTS);
    expect(configEditorTexts('sk').settlementMode).toBe('Spôsob vyúčtovania');
    expect(configEditorTexts('uk').settlement.subscription).toBe('Абонемент');
    expect(configEditorTexts('sk').audiencePlaces).toBe(
      'Kapacita (skupina / jedna osoba)',
    );
    expect(configEditorTexts('uk').formatMode).toBe('Формат (офлайн / онлайн)');
  });
});
