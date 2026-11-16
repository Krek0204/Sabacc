import embezzlement from '@/shared/assets/images/embezzlement.png';
import immunity from '@/shared/assets/images/immunity.png';
import directTransaction from '@/shared/assets/images/direct_transaction.png';
import exhaustion from '@/shared/assets/images/exhaustion.png';
import noTax from '@/shared/assets/images/free_raffle.png';
import generalAudit from '@/shared/assets/images/general_audit.png';
import embargo from '@/shared/assets/images/embargo.png';
import majorFraud from '@/shared/assets/images/major_fraud.png';
import cookBooks from '@/shared/assets/images/cook_books.png';
import devalue from '@/shared/assets/images/devalue.png';
import generalTariff from '@/shared/assets/images/general_tariff.png';
import refund from '@/shared/assets/images/refund.png';
import extraRefund from '@/shared/assets/images/extra_refund.png';

import { TokensTypes } from './types/game';

export const tokenCatalog: Record<TokensTypes, { name: string; symbol: string; icon: string; description: string }> = {
  [TokensTypes.EMBEZZLEMENT]: { name: 'Хищение', symbol: '◈', icon: embezzlement, description: 'Перевести 1 фишку из банка соперника в свой банк.' },
  [TokensTypes.IMMUNITY]: { name: 'Иммунитет', symbol: '🛡', icon: immunity, description: 'Защита от жетонов соперника до конца раунда.' },
  [TokensTypes.DIRECT_TRANSACTION]: { name: 'Прямая транзакция', symbol: '⇄', icon: directTransaction, description: 'Обменять свои карты на карты соперника.' },
  [TokensTypes.EXHAUSTION]: { name: 'Истощение', symbol: '↓', icon: exhaustion, description: 'Соперник сбрасывает карты и берёт новые из закрытой колоды.' },
  [TokensTypes.NO_TAX]: { name: 'Бесплатный розыгрыш', symbol: '⬡', icon: noTax, description: 'Взять карту в текущем ходе без уплаты 1 фишки.' },
  [TokensTypes.GENERAL_AUDIT]: { name: 'Общий аудит', symbol: '⚖', icon: generalAudit, description: 'Соперник платит 2 фишки, если спасовал в этом ходе.' },
  [TokensTypes.EMBARGO]: { name: 'Эмбарго', symbol: '⊘', icon: embargo, description: 'Соперник пропускает следующий ход.' },
  [TokensTypes.IMPOSTERS_TO_SIX]: { name: 'Крупное мошенничество', symbol: '🎲', icon: majorFraud, description: 'Значение «Самозванца» становится равным 6 до вскрытия.' },
  [TokensTypes.COOK_THE_BOOKS]: { name: 'Готовьте книги', symbol: '⇅', icon: cookBooks, description: 'Перевернуть порядок старшинства сабакков до вскрытия.' },
  [TokensTypes.SYLOP_TO_ZERO]: { name: 'Уценка', symbol: '✦', icon: devalue, description: 'Значение карты «Сайлоп» становится равным 0 до вскрытия.' },
  [TokensTypes.OTHER_PLAYERS_PAY_ONE]: { name: 'Общий тариф', symbol: '●', icon: generalTariff, description: 'Соперник платит 1 фишку.' },
  [TokensTypes.TAKE_TWO_CHIPS]: { name: 'Возврат', symbol: '↺', icon: refund, description: 'Вернуть 2 фишки из банка в свой запас.' },
  [TokensTypes.EXTRA_REFUND]: { name: 'Дополнительный возврат', symbol: '↻', icon: extraRefund, description: 'Вернуть 3 фишки из банка в свой запас.' },
};
