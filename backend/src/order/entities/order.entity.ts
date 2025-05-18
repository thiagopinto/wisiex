import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { OrderType } from '../../common/enums/order-type.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { Currency } from '../../common/enums/currency-enum';
import { ApiProperty } from '@nestjs/swagger';
import { DecimalTransformer } from '../../common/transformers/decimal-transformer';
import Decimal from 'decimal.js';

@Entity('orders')
export class Order {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ type: 'int' })
  userId: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ enum: OrderType })
  @Column({ type: 'enum', enum: OrderType })
  type: OrderType;

  @ApiProperty({ type: String, description: 'BTC amount with high precision' })
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: new DecimalTransformer(),
  })
  amount: Decimal;

  @ApiProperty({ type: String, description: 'USD price per BTC' })
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  price: Decimal;

  @ApiProperty({ enum: OrderStatus, default: OrderStatus.ACTIVE })
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.ACTIVE })
  status: OrderStatus;

  @ApiProperty({ type: String, description: 'Filled BTC amount' })
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: new DecimalTransformer(),
  })
  filled: Decimal;

  @ApiProperty({ enum: Currency })
  @Column({ type: 'enum', enum: Currency })
  baseCurrency: Currency;

  @ApiProperty({ enum: Currency })
  @Column({ type: 'enum', enum: Currency })
  quoteCurrency: Currency;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
