// src/components/layout/MainLayout.tsx
import React from "react";
//import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import LoginForm from "../auth/LoginForm"; // Importe o LoginForm
import Button from "react-bootstrap/Button";
import OrderPopover from "../order/OrderPopover";

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  //const navigate = useNavigate();

  if (loading) {
    return <div>Carregando informações de autenticação...</div>;
  }

  return (
    <div className="mainLayout">
      <header className="header">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <h1>
              <i className="bi bi-currency-exchange"></i> <span className="p-2">Exchange</span>Exchange
            </h1>
            <nav className="nav d-flex gap-2">
              {isAuthenticated ? (
                <>
                  <span className="me-3">
                    Saldo: USD{" "}
                    {Number(user?.usdBalanceAvailable) +
                      Number(user?.usdBalanceOnHold)}{" "}
                    BTC{" "}
                    {Number(user?.btcBalanceAvailable) +
                      Number(user?.btcBalanceOnHold)}
                  </span>
                  <OrderPopover
                    currentPrice={10250.42}
                  />
                  <Button className="me-2" onClick={logout} variant="danger">
                    <i className="bi bi-box-arrow-in-left"></i>
                  </Button>
                </>
              ) : (
                <LoginForm />
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="main">{children}</main>

      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 Minha Exchange</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
