import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { StoreContext } from "../context";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const { login } = useContext(StoreContext);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación hardcodeada para admin
    if (isAdminLogin) {
      if (username === "admin" && password === "1234") {
        login(JSON.stringify({ username, password }), true);
        if (rememberMe) {
          localStorage.setItem("adminCredentials", JSON.stringify({ username, password }));
        }
        navigate(from);
        return;
      }
      toast.error("Credenciales de administrador incorrectas");
      return;
    }

    // Aquí iría la lógica para validar con Sage200
    try {
      // Simulamos login exitoso
      const fakeToken = "sage_fake_token";
      login(fakeToken);
      navigate(from);
    } catch (error) {
      toast.error("Error al validar con Sage200");
    }
  };

  return (
    <div className="login-container">
      <h2>{isAdminLogin ? "Acceso Administrador" : "Acceso Usuario"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {isAdminLogin && (
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Recordar credenciales
          </label>
        )}
        <button type="submit">Entrar</button>
      </form>
      <button
        className="switch-mode"
        onClick={() => setIsAdminLogin(!isAdminLogin)}
      >
        {isAdminLogin
          ? "¿Eres usuario normal?"
          : "¿Eres administrador?"}
      </button>
    </div>
  );
};

export default Login;