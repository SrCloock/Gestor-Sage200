import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaPrint, FaArrowLeft, FaCheckCircle, FaBox } from 'react-icons/fa';
import './OrderSupplierReview.css';

const OrderSupplierReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, seriePedido, deliveryDate, items, success } = location.state || {};
  
  const handleBackToOrders = () => navigate('/lista-pedidos-proveedor');
  const handlePrintOrder = () => window.print();

  if (!success) {
    return (
      <div className="order-supplier-review">
        <div className="order-supplier-review__error">
          <h2>Error en el pedido a proveedor</h2>
          <p>No se encontraron datos válidos del pedido</p>
          <button
            className="order-supplier-review__button order-supplier-review__button--back"
            onClick={() => navigate('/crear-pedido-proveedor')}
          >
            <FaArrowLeft /> Volver a intentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-supplier-review">
      <div className="order-supplier-review__container">
        <div className="order-supplier-review__header">
          <h1 className="order-supplier-review__title">
            <FaCheckCircle /> Pedido a Proveedor Confirmado
          </h1>
          <div className="order-supplier-review__success">
            <FaCheckCircle size={20} />
            <span>El pedido se ha registrado exitosamente en nuestro sistema</span>
          </div>
        </div>

        <div className="order-supplier-review__meta">
          <div className="order-supplier-review__details">
            <p className="order-supplier-review__detail">
              <strong>Número de pedido:</strong> {seriePedido}-{orderId}
            </p>
            {deliveryDate && (
              <p className="order-supplier-review__detail">
                <strong>Fecha de entrega solicitada:</strong> {new Date(deliveryDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="order-supplier-review__products">
          <h3>Suministros solicitados</h3>
          <table className="order-supplier-review__table">
            <thead className="order-supplier-review__thead">
              <tr>
                <th>Producto</th>
                <th>Código</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody className="order-supplier-review__tbody">
              {items.map((item, index) => (
                <tr key={index}>
                  <td>{item.DescripcionArticulo}</td>
                  <td>{item.CodigoArticulo}</td>
                  <td>{item.Cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="order-supplier-review__actions">
          <button
            className="order-supplier-review__button order-supplier-review__button--print"
            onClick={handlePrintOrder}
          >
            <FaPrint /> Imprimir Pedido
          </button>
          <button
            className="order-supplier-review__button order-supplier-review__button--back"
            onClick={handleBackToOrders}
          >
            <FaBox /> Ver Pedidos
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSupplierReview;