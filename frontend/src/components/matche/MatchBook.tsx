import { useState, useEffect } from "react";
import { Table } from "react-bootstrap";
import { useSocket } from "../../contexts/SocketContext";
import { matchService } from "../../services/MatchService";
import type { IMatchBook } from "../../interfaces/match";

const MatchBook = () => {
  const { socket } = useSocket();
  const [matchBook, setMatchBook] = useState<IMatchBook | null>(null);

  useEffect(() => {
    matchService
      .getMatcheBook()
      .then((data) => setMatchBook(data))
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = () => {
      matchService
        .getMatcheBook()
        .then((data) => setMatchBook(data))
        .catch((error) => console.error(error));
    };

    socket.on("newOrder", handleNewOrder);
    socket.on("orderMatched", handleNewOrder);

    return () => {
      socket.off("newOrder");
      socket.off("orderMatched");
    };
  }, [socket]);

  if (!matchBook) {
    return <div>Loading Order Book...</div>;
  }

  return (
    <div>
      <h2>Order Book</h2>
      <h3>Buy (Bid)</h3>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Price (USD)</th>
            <th>Amount (BTC)</th>
            <th>Status</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {matchBook.buy.map((match, index) => (
            <tr key={index} style={{ cursor: "pointer" }}>
              <td>{match.price}</td>
              <td>{match.amount}</td>
              <td>{match.orderStatus}</td>
              <td>{match.user}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h3>Sell (Ask)</h3>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Price (USD)</th>
            <th>Amount (BTC)</th>
            <th>Status</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {matchBook.sell.map((match, index) => (
            <tr key={index} style={{ cursor: "pointer" }}>
              <td>{match.price}</td>
              <td>{match.amount}</td>
              <td>{match.orderStatus}</td>
              <td>{match.user}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default MatchBook;
