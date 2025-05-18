import { ApiProperty } from '@nestjs/swagger';
import { DecimalTransformer } from '../../common/transformers/decimal-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import Decimal from 'decimal.js';

@Entity()
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn() // Ou 'int' dependendo da sua estratégia
  id: number; // Assumindo ID string/UUID

  @ApiProperty()
  @Column({ unique: true })
  username: string;

  @ApiProperty()
  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 100.0,
    transformer: new DecimalTransformer(),
  })
  btcBalanceAvailable: Decimal;

  @ApiProperty()
  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 0.0,
    transformer: new DecimalTransformer(),
  })
  btcBalanceOnHold: Decimal;

  @ApiProperty()
  @Column({
    type: 'decimal',
    precision: 20,
    scale: 2,
    default: 100000.0,
    transformer: new DecimalTransformer(),
  })
  usdBalanceAvailable: Decimal;

  @ApiProperty()
  @Column({
    type: 'decimal',
    precision: 20,
    scale: 2,
    default: 0.0,
    transformer: new DecimalTransformer(),
  })
  usdBalanceOnHold: Decimal;

  // --- Colunas de Data/Hora Automáticas ---
  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date; // Será definido na criação
  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date; // Será atualizado em cada salvamento
}
