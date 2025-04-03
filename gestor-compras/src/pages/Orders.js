import { useContext, useMemo } from "react";
import { StoreContext } from "../context";
import OrderItem from "../components/OrderItem";
import { Link } from "react-router-dom";
import "../styles/orders.css";

// Función para formatear fechas
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Función para formatear números como moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

const Orders = () => {
  const { orders, isLoading, error } = useContext(StoreContext);

  const renderStatusMessage = useMemo(() => {
    if (isLoading) {
      return <div className="loading-spinner">Cargando...</div>; 
    }

    if (error) {
      return <p className="error-message">Hubo un error al cargar tus pedidos. Intenta nuevamente más tarde.</p>;
    }

    if (orders.length === 0) {
      return <p className="empty-message">No has realizado ningún pedido aún.</p>;
    }

    return orders.map((order) => (
      <Link to={`/order-details/${order.id}`} key={order.id} className="order-summary">
        <OrderItem order={order} />
      </Link>
    ));
  }, [orders, isLoading, error]);

  return (
    <div className="orders-container">
      <h2 className="orders-title">Historial de Pedidos</h2>
      {renderStatusMessage}
    </div>
  );
};

export default Orders;
