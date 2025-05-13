import React, { useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';
import './OrderSupplierReview.css';

const OrderSupplierReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, seriePedido, deliveryDate, items, success } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!success) {
    return (
      <div className="osr-container">
        <h2>Error al procesar el pedido</h2>
        <p>No se encontraron datos del pedido a proveedor</p>
        <button onClick={() => navigate('/crear-pedido-proveedor')}>
          Volver a crear pedido
        </button>
      </div>
    );
  }

  const handleBackToOrders = () => {
    navigate('/lista-pedidos-proveedor');
  };

  const handlePrintOrder = () => {
    window.print();
  };

  return (
    <div className="osr-container">
      <h2>Pedido a Proveedor Confirmado</h2>
      <p className="osr-success-message">¡Su pedido a proveedor ha sido creado exitosamente!</p>

      <div className="osr-order-summary">
        <div className="osr-order-header">
          <h3>Detalles del Pedido</h3>
          <div className="osr-order-meta">
            <p><strong>Número de Pedido:</strong> {orderId}</p>
            <p><strong>Serie:</strong> {seriePedido}</p>
            {deliveryDate && (
              <p><strong>Fecha de entrega:</strong> {new Date(deliveryDate).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        <div className="osr-order-items">
          <h4>Productos solicitados:</h4>
          <table className="osr-items-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
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

        <div className="osr-actions">
          <button onClick={handlePrintOrder} className="osr-print-btn">
            Imprimir Pedido
          </button>
          <button onClick={handleBackToOrders} className="osr-back-btn">
            Ver todos mis pedidos
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSupplierReview;