import { useContext } from "react";
import { StoreContext } from "../context";
import { NavLink } from "react-router-dom";
import "../styles/navbar.css";

const Navbar = () => {
  const { cart } = useContext(StoreContext);
  const totalItems = cart?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  return (
    <nav className="navbar">
      <div className="container">
        {/* Logo o Nombre */}
        <NavLink to="/" className="logo">
          Sage200
        </NavLink>

        {/* Menú de Navegación */}
        <ul className="navbar-links">
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
              Inicio
            </NavLink>
          </li>
          <li>
            <NavLink to="/products" className={({ isActive }) => (isActive ? "active" : "")}>
              Productos
            </NavLink>
          </li>
          <li>
            <NavLink to="/orders" className={({ isActive }) => (isActive ? "active" : "")}>
              Historial
            </NavLink>
          </li>
          <li>
            <NavLink to="/cart" className={({ isActive }) => (isActive ? "active cart-link" : "cart-link")}>
              Carrito 
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
