// src/components/auth/LoginForm.tsx
import { useState, type FormEvent, useRef } from "react";
import useAuth from "../../hooks/useAuth";
import { Overlay, Popover, Form, Button } from "react-bootstrap";

//interface LoginFormProps {}

const LoginForm = () => {
  const target = useRef<HTMLButtonElement>(null);
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState("");
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(username);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro ao fazer login");
      }
    }
  };

  return (
    <>
      <Button
        ref={target}
        variant="primary"
        onClick={() => setShow(!show)}
        className="me-2"
      >
        <i className="bi bi-box-arrow-in-right"></i>
      </Button>

      <Overlay
        show={show}
        target={target.current}
        placement="bottom"
        rootClose
        onHide={() => setShow(false)}
      >
        <Popover id="login-popover" ref={popoverRef}>
          <Popover.Header
            as="h3"
            className="d-flex justify-content-between align-items-center"
          >
            <div>Login</div>
            <Button
              variant="link"
              className="p-0 m-0 text-dark"
              onClick={() => setShow(false)}
              aria-label="Fechar"
            >
              <i className="bi bi-x-lg"></i>
            </Button>
          </Popover.Header>
          <Popover.Body>
            {error && <div className="alert alert-danger mb-3">{error}</div>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="username">
                <Form.Label>Nome de Usuário</Form.Label>
                <Form.Control
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="w-100">
                Logar
              </Button>
            </Form>
          </Popover.Body>
        </Popover>
      </Overlay>
    </>
  );
};

export default LoginForm;
