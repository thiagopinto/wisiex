export interface IUser {
  id: string;
  username: string;
  btcBalanceAvailable: number; // Saldo de BTC disponível para novos pedidos
  btcBalanceOnHold: number; // Saldo de BTC em pedidos ativos
  usdBalanceAvailable: number; // Saldo de USD disponível para novos pedidos
  usdBalanceOnHold: number; // Saldo de USD em pedidos ativos
}
