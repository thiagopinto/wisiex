import Decimal from 'decimal.js';
import { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  /**
   * Converte Decimal para string antes de salvar no banco.
   */
  to(decimal?: Decimal | number | null): string | null {
    if (decimal === null || decimal === undefined) {
      return null;
    }

    return new Decimal(decimal).toString(); // banco espera string
  }

  /**
   * Converte valor do banco para Decimal.
   */
  from(decimal?: string | number | Decimal | null): Decimal | null {
    if (decimal === null || decimal === undefined) return null;

    if (decimal instanceof Decimal) return decimal;

    return new Decimal(decimal);
  }
}
