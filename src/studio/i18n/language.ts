export type Lang = 'en' | 'sk' | 'uk';

const COOKIE = 'sd_interface_language';

export function readLanguageCookie(): Lang {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE}=(en|sk|uk)(?:;|$)`),
  );
  return (match?.[1] as Lang | undefined) ?? 'en';
}

/** A copy for the sign-in screens. The server does not set this cookie. */
export function writeLanguageCookie(language: Lang) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function languageOf(value: string | null | undefined): Lang {
  if (value === 'sk' || value === 'uk' || value === 'en') return value;
  return 'en';
}

const en = {
  signOut: 'Sign out',
  switchStudio: 'Switch studio',
  chooseStudio: 'Choose a studio',
  noAccess: "You don't have access to this page",
  schedule: 'Schedule',
  catalogs: 'Catalogs',
  clients: 'Clients and bookings',
  subscriptions: 'Subscriptions',
  accounting: 'Accounting and reports',
  studioSettings: 'Studio settings',
  staff: 'Staff',
  title: 'Sign in',
  emailLabel: 'E-mail',
  codeLabel: 'Code',
  sendCode: 'Send code',
  signIn: 'Sign in',
  back: 'Back',
  resendCode: 'Resend code',
  codeGuidance: "If this e-mail has access, we've sent a code",
  sessionExpired: 'Your session has expired. Sign in again',
  invalidEmail: 'Enter a valid e-mail address',
  invalidCode: 'Invalid or expired code',
  codeExpired: 'The code has expired. Request a new one',
  tooManyAttempts: 'Too many attempts. Try again later',
  resendTooEarly: 'Please wait before requesting a new code',
  newCodeSent: 'A new code has been sent',
  somethingWentWrong: 'Something went wrong. Try again',
  save: 'Save',
  update: 'Update',
  edit: 'Edit',
  remove: 'Remove',
  cancel: 'Cancel',
  role: 'Role',
  added: 'Added',
  language: 'Language',
  country: 'Country',
  currency: 'Currency',
  timeZone: 'Time zone',
  administrator: 'Administrator',
  accountant: 'Accountant',
  addStaff: 'Add staff member',
  newStaff: 'New staff member',
  noStaff: 'No staff yet',
  settingsSaved: 'Studio settings saved',
  staffAdded: 'Staff member added',
  staffUpdated: 'Staff member updated',
  staffRemoved: 'Staff member removed',
  removeTitle: 'Remove staff member?',
  emailTaken: 'This e-mail is already added to the studio',
  emailIsOwner: 'This e-mail belongs to the studio owner',
  removeBody:
    '{e-mail} will lose access to the studio immediately. You can add this e-mail again at any time',
};
const sk: typeof en = {
  signOut: 'Sign out',
  switchStudio: 'Prepnúť štúdio',
  chooseStudio: 'Vyberte štúdio',
  noAccess: "You don't have access to this page",
  schedule: 'Rozvrh',
  catalogs: 'Katalógy',
  clients: 'Klienti a rezervácie',
  subscriptions: 'Permanentky',
  accounting: 'Účtovníctvo a reporty',
  studioSettings: 'Nastavenia štúdia',
  staff: 'Zamestnanci',
  title: 'Prihlásenie',
  emailLabel: 'E-mail',
  codeLabel: 'Kód',
  sendCode: 'Poslať kód',
  signIn: 'Prihlásiť sa',
  back: 'Späť',
  resendCode: 'Poslať kód znova',
  codeGuidance: 'Ak má tento e-mail prístup, poslali sme kód',
  sessionExpired: 'Your session has expired. Sign in again',
  invalidEmail: 'Enter a valid e-mail address',
  invalidCode: 'Invalid or expired code',
  codeExpired: 'The code has expired. Request a new one',
  tooManyAttempts: 'Too many attempts. Try again later',
  resendTooEarly: 'Please wait before requesting a new code',
  newCodeSent: 'A new code has been sent',
  somethingWentWrong: 'Something went wrong. Try again',
  save: 'Uložiť',
  update: 'Aktualizovať',
  edit: 'Upraviť',
  remove: 'Odstrániť',
  cancel: 'Zrušiť',
  role: 'Rola',
  added: 'Pridané',
  language: 'Jazyk',
  country: 'Krajina',
  currency: 'Mena',
  timeZone: 'Časové pásmo',
  administrator: 'Administrátor',
  accountant: 'Účtovník',
  addStaff: 'Add staff member',
  newStaff: 'Nový zamestnanec',
  noStaff: 'No staff yet',
  settingsSaved: 'Studio settings saved',
  staffAdded: 'Staff member added',
  staffUpdated: 'Staff member updated',
  staffRemoved: 'Staff member removed',
  removeTitle: 'Remove staff member?',
  emailTaken: 'This e-mail is already added to the studio',
  emailIsOwner: 'This e-mail belongs to the studio owner',
  removeBody:
    '{e-mail} will lose access to the studio immediately. You can add this e-mail again at any time',
};
const uk: typeof en = {
  signOut: 'Sign out',
  switchStudio: 'Змінити студію',
  chooseStudio: 'Оберіть студію',
  noAccess: "You don't have access to this page",
  schedule: 'Розклад',
  catalogs: 'Каталоги',
  clients: 'Клієнти та записи',
  subscriptions: 'Абонементи',
  accounting: 'Облік і звіти',
  studioSettings: 'Налаштування студії',
  staff: 'Співробітники',
  title: 'Вхід',
  emailLabel: 'E-mail',
  codeLabel: 'Код',
  sendCode: 'Надіслати код',
  signIn: 'Увійти',
  back: 'Назад',
  resendCode: 'Надіслати код ще раз',
  codeGuidance: 'Якщо ця пошта має доступ, ми надіслали код',
  sessionExpired: 'Your session has expired. Sign in again',
  invalidEmail: 'Enter a valid e-mail address',
  invalidCode: 'Invalid or expired code',
  codeExpired: 'The code has expired. Request a new one',
  tooManyAttempts: 'Too many attempts. Try again later',
  resendTooEarly: 'Please wait before requesting a new code',
  newCodeSent: 'A new code has been sent',
  somethingWentWrong: 'Something went wrong. Try again',
  save: 'Зберегти',
  update: 'Оновити',
  edit: 'Змінити',
  remove: 'Видалити',
  cancel: 'Скасувати',
  role: 'Роль',
  added: 'Додано',
  language: 'Мова',
  country: 'Країна',
  currency: 'Валюта',
  timeZone: 'Часовий пояс',
  administrator: 'Адміністратор',
  accountant: 'Бухгалтер',
  addStaff: 'Add staff member',
  newStaff: 'Новий співробітник',
  noStaff: 'No staff yet',
  settingsSaved: 'Studio settings saved',
  staffAdded: 'Staff member added',
  staffUpdated: 'Staff member updated',
  staffRemoved: 'Staff member removed',
  removeTitle: 'Remove staff member?',
  emailTaken: 'This e-mail is already added to the studio',
  emailIsOwner: 'This e-mail belongs to the studio owner',
  removeBody:
    '{e-mail} will lose access to the studio immediately. You can add this e-mail again at any time',
};

const dictionaries = { en, sk, uk };

export type Copy = typeof en;

export function copy(language: Lang): Copy {
  return dictionaries[language];
}

export const LANGUAGE_CHOICES: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'sk', label: 'Slovenčina' },
  { id: 'uk', label: 'Українська' },
];
