import React from "react";
import type { IMatch } from "../../interfaces/match";

interface MatchListProps {
  matches: IMatch[];
}

const MatchList: React.FC<MatchListProps> = ({ matches }) => {
  const latestMatches = matches.slice(0, 10);

  return (
    <div>
      <h2>Global Matches</h2>
      <table>
        <thead>
          <tr>
            <th>Price</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          {latestMatches.map((match) => (
            <tr key={match.id}>
              <td>{match.price.toString()}</td>
              <td>{match.amount.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchList;
