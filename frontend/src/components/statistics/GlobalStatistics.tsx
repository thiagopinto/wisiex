import React, { useState, useEffect } from 'react';
    import { Card, ListGroup } from 'react-bootstrap';
import { statisticsService } from '../../services/StatisticsService';
import type { IGlobalStatistics } from '../../interfaces/statistics';
 
    const GlobalStatistics: React.FC = () => {
      const [statistics, setStatistics] = useState<IGlobalStatistics | null>(null);
 
      useEffect(() => {
        statisticsService.getGlobalStatistics()
          .then(data => setStatistics(data))
          .catch(error => console.error(error));
      }, []);
 
      if (!statistics) {
        return <div>Loading Statistics...</div>;
      }
 
      return (
        <Card>
          <Card.Body>
            <h2>Global Statistics</h2>
            <ListGroup>
              <ListGroup.Item>Last Price: {statistics.lastPrice}</ListGroup.Item>
              <ListGroup.Item>BTC Volume (24h): {statistics.btcVolume}</ListGroup.Item>
              <ListGroup.Item>USD Volume (24h): {statistics.usdVolume}</ListGroup.Item>
              <ListGroup.Item>High (24h): {statistics.high}</ListGroup.Item>
              <ListGroup.Item>Low (24h): {statistics.low}</ListGroup.Item>
            </ListGroup>
          </Card.Body>
        </Card>
      );
    };
 
    export default GlobalStatistics;