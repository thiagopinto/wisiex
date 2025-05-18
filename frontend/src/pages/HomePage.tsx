import { Container, Row, Col } from "react-bootstrap";
import GlobalStatistics from "../components/statistics/GlobalStatistics";
import useAuth from "../hooks/useAuth";
import MatchBook from "../components/matche/MatchBook";
import OrderList from "../components/order/OrderList";
import GlobalMatches from "../components/matche/GlobalMatches";
import OrderHistory from "../components/order/OrderHistory";
import Card from "react-bootstrap/Card";

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      <h1>Bem-vindo à Exchange</h1>
      <Container fluid className="d-flex justify-content-around">
        <Row className="w-100">
          <Col className="d-flex flex-column align-items-center">
            <Card className="bg-light">
              <Card.Body>
                <GlobalStatistics />
                <GlobalMatches />
              </Card.Body>
            </Card>
          </Col>

          {isAuthenticated && (
            <Col className="d-flex flex-column align-items-center">
              <Card className="bg-light">
                <Card.Body>
                  <MatchBook />
                  <OrderList />
                  <OrderHistory />
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Container>
    </div>
  );
};

export default HomePage;
