import React, { useState, useEffect } from "react";
import { Table } from "react-bootstrap";
import { matchService } from "../../services/MatchService";
import type { IMatch } from "../../interfaces/match";
import { useSocket } from "../../contexts/SocketContext";

const GlobalMatches: React.FC = () => {
  const [matches, setMatches] = useState<IMatch[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    matchService
      .getLatestMatches()
      .then((data) => setMatches(data))
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = () => {
      matchService
        .getLatestMatches()
        .then((data) => setMatches(data))
        .catch((error) => console.error(error));
    };

    socket.on("newOrder", handleNewOrder);
    socket.on("orderMatched", handleNewOrder);

    return () => {
      socket.off("newOrder");
      socket.off("orderMatched");
    };
  }, [socket]);

  return (
    <div>
      <h2>Global Matches</h2>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Price (USD)</th>
            <th>Amount (BTC)</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.id}>
              <td>{match.price}</td>
              <td>{match.amount}</td>
              <td>{match.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default GlobalMatches;
