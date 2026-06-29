/**
 * LiqPay error code → Ukrainian user-facing message mapping.
 * Never expose the raw err_code to the user.
 */

export interface LiqPayErrorInfo {
  message: string;
  offerAfterpayment: boolean;
}

const LIQPAY_ERROR_MAP: Record<string, LiqPayErrorInfo> = {
  limit: {
    message: 'Перевищено ліміти платежу. Зверніться до свого банку або спробуйте іншу картку.',
    offerAfterpayment: true,
  },
  invalid_card: {
    message: 'Невірні реквізити картки. Перевірте номер картки та спробуйте ще раз.',
    offerAfterpayment: false,
  },
  card_blocked: {
    message: 'Картку заблоковано. Зверніться до вашого банку для розблокування.',
    offerAfterpayment: false,
  },
  card_expired: {
    message: 'Термін дії картки закінчився. Скористайтесь іншою карткою.',
    offerAfterpayment: false,
  },
  not_enough_money: {
    message: 'Недостатньо коштів на картці. Поповніть рахунок або скористайтесь іншою карткою.',
    offerAfterpayment: true,
  },
  one_click_not_available: {
    message: 'Швидка оплата недоступна для цієї картки. Спробуйте ввести реквізити вручну.',
    offerAfterpayment: false,
  },
  '3ds_not_passed': {
    message: 'Не пройдено перевірку безпеки 3D Secure. Спробуйте ще раз або зверніться до банку.',
    offerAfterpayment: false,
  },
  fail_otp: {
    message: 'Невірний одноразовий код підтвердження. Перевірте SMS та спробуйте ще раз.',
    offerAfterpayment: false,
  },
  sender_not_verified: {
    message: 'Не вдалося підтвердити особу платника. Зверніться до служби підтримки.',
    offerAfterpayment: false,
  },
  wrong_amount_currency: {
    message: 'Невірна сума або валюта платежу. Зверніться до служби підтримки.',
    offerAfterpayment: false,
  },
  payment_blocked: {
    message: 'Платіж заблоковано. Зверніться до вашого банку.',
    offerAfterpayment: false,
  },
  fail_phone_check: {
    message: 'Не вдалося перевірити номер телефону. Переконайтеся, що вказали правильний номер.',
    offerAfterpayment: false,
  },
  phone_not_sent: {
    message: 'Номер телефону не вказано. Заповніть поле та спробуйте ще раз.',
    offerAfterpayment: false,
  },
  err_commission: {
    message: 'Помилка при розрахунку комісії. Спробуйте пізніше або зверніться до підтримки.',
    offerAfterpayment: false,
  },
  score_kill: {
    message: 'Платіж відхилено системою безпеки. Зверніться до служби підтримки.',
    offerAfterpayment: false,
  },
  incorrect_credentials: {
    message: 'Невірні платіжні дані. Перевірте введені реквізити картки.',
    offerAfterpayment: false,
  },
  err_declined: {
    message: 'Банк відхилив платіж. Зверніться до вашого банку або скористайтесь іншою карткою.',
    offerAfterpayment: true,
  },
};

const FALLBACK_ERROR: LiqPayErrorInfo = {
  message: 'Оплату не завершено. Спробуйте ще раз або зверніться до служби підтримки.',
  offerAfterpayment: false,
};

/**
 * Returns a safe Ukrainian error message for a given LiqPay err_code.
 * Falls back to a generic message if the code is unknown.
 */
export function getLiqPayErrorInfo(errCode: string | null | undefined): LiqPayErrorInfo {
  if (!errCode) return FALLBACK_ERROR;
  return LIQPAY_ERROR_MAP[errCode] ?? FALLBACK_ERROR;
}
