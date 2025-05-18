import React, { useState, useEffect } from "react";
import { Table, Button } from "react-bootstrap";
import type { IOrder } from "../../interfaces/order";
import orderService from "../../services/OrderService";
import { useSocket } from "../../contexts/SocketContext";

const OrderList = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    orderService
      .getOrders()
      .then((data) => setOrders(data))
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = () => {
      orderService
        .getOrders()
        .then((data) => setOrders(data))
        .catch((error) => console.error(error));
    };

    socket.on("newOrder", handleNewOrder);
    socket.on("orderMatched", handleNewOrder);

    return () => {
      socket.off("newOrder");
      socket.off("orderMatched");
    };
  }, [socket]);

  const handleCancelOrder = async (orderId: number) => {
    try {
      await orderService.cancelOrder(orderId);
      alert("Order cancelled!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <div>
      <h2>Active Orders</h2>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Amount (BTC)</th>
            <th>Price (USD)</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.amount}</td>
              <td>{order.price}</td>
              <td>{order.type}</td>
              <td>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleCancelOrder(order.id)}
                >
                  Cancel
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default OrderList;
