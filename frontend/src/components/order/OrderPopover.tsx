import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Popover,
  Overlay,
  Form,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from "react-bootstrap";
import orderService from "../../services/OrderService";
import useAuth from "../../hooks/useAuth";
import { Decimal } from "decimal.js"; // Import Decimal

interface OrderPopoverProps {
  currentPrice?: number;
  onOrderCreated?: () => void;
}

const OrderPopover: React.FC<OrderPopoverProps> = ({
  currentPrice,
  onOrderCreated,
}) => {
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState<string>(""); // Store as string
  const [price, setPrice] = useState<string>(
    currentPrice ? currentPrice.toString() : ""
  ); // Store as string
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const target = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();

  // Update price when currentPrice prop changes
  useEffect(() => {
    if (currentPrice !== undefined) {
      setPrice(currentPrice.toString());
    }
  }, [currentPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const amountDecimal = new Decimal(amount || "0");
      const priceDecimal = new Decimal(price || "0");

      // Validações usando Decimal
      if (amountDecimal.lte(0) || priceDecimal.lte(0)) {
        setError("Amount and price must be positive values");
        return;
      }

      if (orderType === "buy") {
        const totalCost = priceDecimal.mul(amountDecimal);
        const userBalance = new Decimal(user?.usdBalanceAvailable || "0");
        if (totalCost.gt(userBalance)) {
          setError("Insufficient USD balance");
          return;
        }
      }

      if (orderType === "sell") {
        const userBTCAmount = new Decimal(user?.btcBalanceAvailable || "0");
        if (amountDecimal.gt(userBTCAmount)) {
          setError("Insufficient BTC balance");
          return;
        }
      }

      setIsSubmitting(true);
      setError(null);

      // Chamada para o serviço de criação de ordem
      const result = await orderService.createOrder({
        amount: amountDecimal.toString(), // Convert back to number
        price: priceDecimal.toString(), // Convert back to number
        type: orderType,
      });

      console.log("Order created:", result);

      // Reset do formulário
      setAmount("");
      setShow(false);

      // Notifica o componente pai para atualizar dados
      if (onOrderCreated) onOrderCreated();
    } catch (err) {
      console.error("Order creation error:", err);
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total using Decimal for display
  const total =
    price && amount
      ? new Decimal(price || "0").mul(new Decimal(amount || "0")).toFixed(2)
      : "0.00";

  return (
    <>
      {/* ... (rest of your component remains largely the same, with minor adjustments) */}
      <Button
        ref={target}
        variant="primary"
        onClick={() => setShow(!show)}
        className="me-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          ></span>
        ) : (
          <i className="bi bi-cart-plus"></i>
        )}
      </Button>

      <Overlay
        show={show}
        target={target.current}
        placement="bottom"
        rootClose
        onHide={() => {
          setShow(false);
          setError(null);
        }}
      >
        <Popover className="order-popover">
          <Popover.Header
            as="h3"
            className="d-flex justify-content-between align-items-center"
          >
            <div>
              <i
                className={`bi bi-${
                  orderType === "buy"
                    ? "arrow-down-circle text-success"
                    : "arrow-up-circle text-danger"
                } me-2`}
              ></i>
              New Order ({orderType === "buy" ? "Buy" : "Sell"})
            </div>
            <Button
              variant="link"
              className="p-0 m-0 text-dark"
              onClick={() => setShow(false)}
              aria-label="Close"
              disabled={isSubmitting}
            >
              <i className="bi bi-x-lg"></i>
            </Button>
          </Popover.Header>
          <Popover.Body>
            {error && (
              <Alert
                variant="danger"
                onClose={() => setError(null)}
                dismissible
              >
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <ToggleButtonGroup
                  type="radio"
                  name="order-type"
                  value={orderType}
                  onChange={(val) => setOrderType(val)}
                  className="w-100 mb-3"
                >
                  <ToggleButton
                    id="buy-radio"
                    value={"buy"}
                    variant={
                      orderType === "buy"
                        ? "outline-success"
                        : "outline-secondary"
                    }
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-arrow-down-circle me-2"></i>
                    Buy BTC
                  </ToggleButton>
                  <ToggleButton
                    id="sell-radio"
                    value={"sell"}
                    variant={
                      orderType === "sell"
                        ? "outline-danger"
                        : "outline-secondary"
                    }
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-arrow-up-circle me-2"></i>
                    Sell BTC
                  </ToggleButton>
                </ToggleButtonGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="bi bi-currency-bitcoin me-2"></i>
                  Volume BTC
                </Form.Label>
                <Form.Control
                  type="text" // Changed to text
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  disabled={isSubmitting}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="bi bi-currency-dollar me-2"></i>
                  Price USD
                </Form.Label>
                <Form.Control
                  type="text" // Changed to text
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                  disabled={isSubmitting}
                />
              </Form.Group>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>
                  <i className="bi bi-calculator me-2"></i>
                  Total
                </span>
                <strong className="fs-5">{total} USD</strong>
              </div>

              <Button
                variant={orderType === "buy" ? "success" : "danger"}
                type="submit"
                className="w-100"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i
                      className={`bi bi-${
                        orderType === "buy" ? "cart-plus" : "cart-dash"
                      } me-2`}
                    ></i>
                    Confirm {orderType === "buy" ? "Buy" : "Sell"}
                  </>
                )}
              </Button>
            </Form>
          </Popover.Body>
        </Popover>
      </Overlay>
    </>
  );
};

export default OrderPopover;
