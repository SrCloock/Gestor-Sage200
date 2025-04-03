import React from "react";
import PropTypes from "prop-types";
import "../styles/orderItem.css"; // Asegúrate de tener el CSS correspondiente

const OrderItem = ({ order }) => {
  if (!order) return <p>No hay información del pedido.</p>;

  const { id, total = 0, date, items = [] } = order;

  // Formatear la fecha
  const formattedDate = date
    ? new Date(date).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Fecha desconocida";

  // Formatear el precio
  const formatPrice = (amount) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);

  return (
    <div className="order-item">
      <h3 className="order-id">
        Pedido #{id ?? "Desconocido"} - {formatPrice(total)}
      </h3>
      <p className="order-date">Fecha: {formattedDate}</p>

      {items.length > 0 ? (
        <ul className="order-items-list">
          {items.map((item) => (
            <li key={item.productId ?? item.name} className="order-item-detail">
              <div className="order-item-name">{item.name}</div>
              <div className="order-item-price">{formatPrice(item.price)}</div>
              <div className="order-item-quantity">x{item.quantity}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay productos en este pedido.</p>
      )}
    </div>
  );
};

// Validación de las props
OrderItem.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    total: PropTypes.number,
    date: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string.isRequired,
        price: PropTypes.number.isRequired,
        quantity: PropTypes.number.isRequired,
      })
    ),
  }),
};

export default OrderItem;
