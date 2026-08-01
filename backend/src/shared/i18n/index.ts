import { en, type TranslationKey } from './en';
import { ta } from './ta';

export type { TranslationKey };
export { en, ta };

const translations = { en, ta } as const;
export type SupportedLang = keyof typeof translations;

export function getTranslation(lang: SupportedLang, key: TranslationKey): string {
  return translations[lang][key];
}
