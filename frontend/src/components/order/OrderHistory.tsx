import { useState, useEffect } from "react";
import { Table } from "react-bootstrap";
import type { IOrder } from "../../interfaces/order";
import orderService from "../../services/OrderService";
import { useSocket } from "../../contexts/SocketContext";

const OrderHistory = () => {
  const [orderHistory, setOrderHistory] = useState<IOrder[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    orderService
      .getOrderHistory()
      .then((data) => setOrderHistory(data))
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = () => {
      orderService
        .getOrderHistory()
        .then((data) => setOrderHistory(data))
        .catch((error) => console.error(error));
    };

    socket.on("newOrder", handleNewOrder);

    return () => {
      socket.off("newOrder");
    };
  }, [socket]);

  return (
    <div>
      <h2>Order History</h2>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Amount (BTC)</th>
            <th>Price (USD)</th>
            <th>Type</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {orderHistory.map((order) => (
            <tr key={order.id}>
              <td>{order.amount}</td>
              <td>{order.price}</td>
              <td>{order.type}</td>
              <td>{order.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default OrderHistory;
