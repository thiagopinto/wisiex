import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { DecimalTransformer } from '../../common/transformers/decimal-transformer';
import Decimal from 'decimal.js';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'int' })
  orderId: number;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'counterOrderId' })
  counterOrder: Order | null;

  @Column({ type: 'int', nullable: true })
  counterOrderId: number | null;

  @Column({ type: 'int' })
  takerId: number;

  @Column({ type: 'int', nullable: true })
  makerId: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: new DecimalTransformer(),
  })
  amount: Decimal;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  price: Decimal;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  takerFee: Decimal | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  makerFee: Decimal | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
