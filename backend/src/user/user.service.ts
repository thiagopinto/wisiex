import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { User as UserEntity } from './entities/user.entity';
import { OrderType } from '../common/enums/order-type.enum';
import Decimal from 'decimal.js';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  // Método existente para buscar um usuário por username (fora de transação)
  async findOne(username: string): Promise<UserEntity | undefined> {
    const user = await this.usersRepository.findOne({ where: { username } });
    return user ?? undefined;
  }

  // Método existente para criar um usuário
  async create(username: string): Promise<UserEntity> {
    const newUser = this.usersRepository.create({
      username,
      btcBalanceAvailable: 100,
      btcBalanceOnHold: 0,
      usdBalanceAvailable: 100000,
      usdBalanceOnHold: 0,
    });
    return this.usersRepository.save(newUser);
  }

  // Método existente para buscar um usuário por ID (fora de transação)
  async findById(id: number): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  // Método existente para atualizar um usuário
  async update(user: UserEntity): Promise<UserEntity> {
    return this.usersRepository.save(user);
  }

  /**
   * Verifica se o usuário tem saldo DISPONÍVEL suficiente 💸.
   * Projetado para ser usado *fora* de transações para validação inicial rápida.
   * A validação FINAL e reserva devem ocorrer DENTRO da transação via reserveBalance.
   * @param user - A entidade User obtida fora da transação (ex: pelo Guard).
   * @param type - Tipo da ordem (BUY/SELL).
   * @param volume - Volume da ordem.
   * @param price - Preço da ordem.
   * @returns boolean - True se tem saldo disponível, False caso contrário.
   * @throws InternalServerErrorException se a entidade user for nula (indica um problema anterior).
   */
  checkAvailableBalance(
    user: UserEntity,
    type: OrderType,
    volume: number,
    price: number,
  ): boolean {
    if (!user) {
      console.error(
        `[UserService] User entity is null during checkAvailableBalance`,
      );
      throw new InternalServerErrorException(
        'Dados do usuário não disponíveis para verificação de saldo.',
      );
    }

    const volumeDecimal = new Decimal(volume);
    const priceDecimal = new Decimal(price);

    const requiredAmount =
      type === OrderType.BUY ? volumeDecimal.mul(priceDecimal) : volumeDecimal;

    if (type === OrderType.BUY) {
      return user.usdBalanceAvailable.greaterThanOrEqualTo(requiredAmount);
    } else {
      // OrderType.SELL
      return user.btcBalanceAvailable.greaterThanOrEqualTo(requiredAmount);
    }
  }

  /**
   * Deduz o saldo AVAILABLE e move para ON_HOLD DENTRO DE UMA TRANSAÇÃO EXISTENTE.
   * CRUCIAL: Busca o usuário e opera USANDO o entityManager fornecido para garantir atomicidade.
   * @param userId - ID do usuário (number). // <-- Recebe o ID
   * @param type - Tipo da ordem (BUY/SELL).
   * @param volume - Volume da ordem.
   * @param price - Preço da ordem (necessário para calcular USD equivalente para BUY).
   * @param entityManager - O EntityManager DA TRANSAÇÃO ATUAL. // <-- Recebe o EM
   * @returns Promise<UserEntity> - O usuário atualizado DENTRO da transação.
   * @throws BadRequestException se o saldo disponível for insuficiente (lançar para rollback).
   * @throws InternalServerErrorException se o usuário não for encontrado (lançar para rollback).
   */
  async reserveBalance(
    userId: number,
    type: OrderType,
    volume: Decimal,
    price: Decimal,
    entityManager: EntityManager,
  ): Promise<UserEntity> {
    const requiredAmount = type === OrderType.BUY ? volume.mul(price) : volume;

    const currencyToHold = type === OrderType.BUY ? 'USD' : 'BTC';

    const user = await entityManager.findOne(UserEntity, {
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      console.error(
        `[UserService] User not found during reserveBalance: ${userId}`,
      );
      throw new InternalServerErrorException(
        'Usuário não encontrado ao tentar reservar saldo.',
      );
    }

    let hasSufficientAvailableBalance = false;
    if (type === OrderType.BUY) {
      hasSufficientAvailableBalance =
        user.usdBalanceAvailable.greaterThanOrEqualTo(requiredAmount);
    } else {
      hasSufficientAvailableBalance =
        user.btcBalanceAvailable.greaterThanOrEqualTo(requiredAmount);
    }

    if (!hasSufficientAvailableBalance) {
      throw new BadRequestException(
        `Saldo disponível insuficiente em ${currencyToHold} para reservar.`,
      );
    }

    if (type === OrderType.BUY) {
      user.usdBalanceAvailable = user.usdBalanceAvailable.sub(requiredAmount);
      user.usdBalanceOnHold = user.usdBalanceOnHold.add(requiredAmount);
    } else {
      user.btcBalanceAvailable = user.btcBalanceAvailable.sub(requiredAmount);
      user.btcBalanceOnHold = user.btcBalanceOnHold.add(requiredAmount);
    }

    await entityManager.save(user);

    return user;
  }

  /**
   * Deduz saldo ON_HOLD e ajusta saldos AVAILABLE após match ou cancelamento, DENTRO DE UMA TRANSAÇÃO EXISTENTE.
   * CRUCIAL: Busca o usuário e opera USANDO o entityManager fornecido para garantir atomicidade.
   * Implementada no daemon de matching.
   * @param userId - ID do usuário (number). // <-- Recebe o ID
   * @param volumeOrValueToRelease - A quantidade a ser liberada/ajustada do ON_HOLD.
   * @param resultingAvailableAmount - O valor que o usuário DEVE receber em AVAILABLE (já considerando taxas e moeda oposta).
   * @param onHoldCurrency - A moeda que estava 'On Hold' ('BTC' ou 'USD').
   * @param availableCurrency - A moeda que deve ir para 'Available' após o ajuste ('BTC' ou 'USD').
   * @param entityManager - O EntityManager DA TRANSAÇÃO ATUAL. // <-- Recebe o EM
   * @returns Promise<UserEntity> - O usuário atualizado DENTRO da transação.
   * @throws InternalServerErrorException se o usuário não for encontrado (lançar para rollback).
   */
  async releaseAndAdjustBalance(
    userId: number,
    volumeOrValueToRelease: Decimal, // <-- Já é Decimal
    resultingAvailableAmount: Decimal, // <-- Já é Decimal
    onHoldCurrency: 'BTC' | 'USD',
    availableCurrency: 'BTC' | 'USD',
    entityManager: EntityManager,
  ): Promise<UserEntity> {
    const user = await entityManager.findOne(UserEntity, {
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      console.error(
        `[UserService] User not found during releaseAndAdjustBalance: ${userId}`,
      );
      throw new InternalServerErrorException(
        'Usuário não encontrado ao tentar liberar/ajustar saldo.',
      );
    }

    const zeroDecimal = new Decimal(0);

    if (onHoldCurrency === 'USD') {
      user.usdBalanceOnHold = user.usdBalanceOnHold.minus(
        volumeOrValueToRelease,
      );
      if (user.usdBalanceOnHold.lessThan(zeroDecimal)) {
        user.usdBalanceOnHold = zeroDecimal;
      }
    } else {
      user.btcBalanceOnHold = user.btcBalanceOnHold.minus(
        volumeOrValueToRelease,
      );
      if (user.btcBalanceOnHold.lessThan(zeroDecimal)) {
        user.btcBalanceOnHold = zeroDecimal;
      }
    }

    if (availableCurrency === 'USD') {
      user.usdBalanceAvailable = user.usdBalanceAvailable.plus(
        resultingAvailableAmount,
      );
    } else {
      user.btcBalanceAvailable = user.btcBalanceAvailable.plus(
        resultingAvailableAmount,
      );
    }

    await entityManager.save(user);

    return user;
  }

  /**
   * Libera saldo ON_HOLD de volta para AVAILABLE no caso de cancelamento ou pedido parcialmente preenchido, DENTRO DE UMA TRANSAÇÃO EXISTENTE.
   * CRUCIAL: Busca o usuário e opera USANDO o entityManager fornecido para garantir atomicidade.
   * Usado no daemon de matching ou no endpoint de cancelamento de ordem.
   * @param userId - ID do usuário (number). // <-- Recebe o ID
   * @param currency - Moeda a ser liberada ('BTC' ou 'USD').
   * @param amount - A quantidade a ser movida de ON_HOLD para AVAILABLE.
   * @param entityManager - O EntityManager DA TRANSAÇÃO ATUAL. // <-- Recebe o EM
   * @returns Promise<UserEntity> - O usuário atualizado DENTRO da transação.
   * @throws InternalServerErrorException se o usuário não for encontrado (lançar para rollback).
   */

  async releaseOnHoldBalanceToAvailable(
    userId: number,
    currency: 'BTC' | 'USD',
    amount: Decimal, // <-- Já deve ser Decimal
    entityManager: EntityManager,
  ): Promise<UserEntity> {
    const user = await entityManager.findOne(UserEntity, {
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      console.error(
        `[UserService] User not found during releaseOnHoldBalanceToAvailable: ${userId}`,
      );
      throw new InternalServerErrorException(
        'Usuário não encontrado ao tentar liberar saldo em espera.',
      );
    }

    const zeroDecimal = new Decimal(0);

    if (currency === 'USD') {
      user.usdBalanceOnHold = user.usdBalanceOnHold.minus(amount);
      user.usdBalanceAvailable = user.usdBalanceAvailable.plus(amount);
      if (user.usdBalanceOnHold.lessThan(zeroDecimal)) {
        user.usdBalanceOnHold = zeroDecimal;
      }
    } else {
      user.btcBalanceOnHold = user.btcBalanceOnHold.minus(amount);
      user.btcBalanceAvailable = user.btcBalanceAvailable.plus(amount);
      if (user.btcBalanceOnHold.lessThan(zeroDecimal)) {
        user.btcBalanceOnHold = zeroDecimal;
      }
    }

    await entityManager.save(user);

    return user;
  }

  /**
   *
   * @param takerId
   * @param makerId
   * @param orderType
   * @param amount
   * @param price
   * @param entityManager
   * @returns Promise<void>
   * @throws InternalServerErrorException
   * @description Executa a troca entre dois usuários (taker e maker) e ajusta os saldos disponíveis e em espera.
   */
  async executeTrade(
    takerId: number,
    makerId: number,
    orderType: OrderType,
    amount: Decimal,
    price: Decimal,
    entityManager: EntityManager,
  ): Promise<void> {
    try {
      const taker = await entityManager.findOne(UserEntity, {
        where: { id: takerId },
        lock: { mode: 'pessimistic_write' },
      });

      const maker = await entityManager.findOne(UserEntity, {
        where: { id: makerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!taker || !maker) {
        throw new InternalServerErrorException(
          'Usuário taker ou maker não encontrado.',
        );
      }

      const totalQuoteAmount = amount.mul(price);

      if (orderType === OrderType.BUY) {
        taker.usdBalanceOnHold = taker.usdBalanceOnHold.sub(totalQuoteAmount);
        maker.btcBalanceOnHold = maker.btcBalanceOnHold.sub(amount);
        taker.btcBalanceAvailable = taker.btcBalanceAvailable.add(amount);
        maker.usdBalanceAvailable =
          maker.usdBalanceAvailable.add(totalQuoteAmount);
      } else {
        taker.btcBalanceOnHold = taker.btcBalanceOnHold.sub(amount);
        maker.usdBalanceOnHold = maker.usdBalanceOnHold.sub(totalQuoteAmount);
        taker.usdBalanceAvailable =
          taker.usdBalanceAvailable.add(totalQuoteAmount);
        maker.btcBalanceAvailable = maker.btcBalanceAvailable.add(amount);
      }

      await entityManager.save(UserEntity, taker);
      await entityManager.save(UserEntity, maker);
    } catch (error) {
      console.error('Erro ao executar a troca:', error);
      throw new InternalServerErrorException(
        'Falha ao executar a troca: ' + error.message,
      );
    }
  }
  /**
   * Libera o saldo reservado de volta para o saldo disponível.
   * @param userId - ID do usuário (number).
   * @param orderType - Tipo da ordem (BUY/SELL).
   * @param amount - Quantidade a ser liberada.
   * @param price - Preço da ordem (necessário para calcular o valor total).
   * @param entityManager - O EntityManager DA TRANSAÇÃO ATUAL.
   * @returns Promise<void>
   * @throws InternalServerErrorException se o usuário não for encontrado.
   */
  async releaseReservedBalance(
    userId: number,
    orderType: OrderType,
    amount: Decimal,
    price: Decimal,
    entityManager: EntityManager,
  ): Promise<void> {
    try {
      const user = await entityManager.findOne(UserEntity, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new InternalServerErrorException(
          'Usuário não encontrado ao liberar saldo reservado.',
        );
      }

      const totalQuoteAmount = amount.mul(price);

      if (orderType === OrderType.BUY) {
        const amountToRelease = Decimal.min(
          user.usdBalanceOnHold,
          totalQuoteAmount,
        );
        user.usdBalanceAvailable =
          user.usdBalanceAvailable.add(amountToRelease);
        user.usdBalanceOnHold = Decimal.max(
          new Decimal(0),
          user.usdBalanceOnHold.sub(totalQuoteAmount),
        );
      } else if (orderType === OrderType.SELL) {
        const amountToRelease = Decimal.min(user.btcBalanceOnHold, amount);
        user.btcBalanceAvailable =
          user.btcBalanceAvailable.add(amountToRelease);
        user.btcBalanceOnHold = Decimal.max(
          new Decimal(0),
          user.btcBalanceOnHold.sub(amount),
        );
      }

      await entityManager.save(UserEntity, user);
    } catch (error) {
      console.error('Erro ao liberar saldo reservado:', error);
      throw new InternalServerErrorException(
        'Falha ao liberar saldo reservado: ' + error.message,
      );
    }
  }

  /**
   * Encontra um usuário pelo ID.
   * @param id - ID do usuário.
   * @returns Promise<User> - O usuário encontrado.
   * @throws NotFoundException se o usuário não for encontrado.
   * @throws InternalServerErrorException se ocorrer um erro ao buscar o usuário.
   */
  async findUserById(id: number): Promise<UserEntity> {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
      }
      return user;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Falha ao encontrar usuário.');
    }
  }

  async getUserStatistics(userId: number): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      usdBalance: user.usdBalanceAvailable.toString(),
      btcBalance: user.btcBalanceAvailable.toString(),
    };
  }
}
