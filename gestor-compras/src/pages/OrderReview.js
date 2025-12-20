import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaCalendarCheck, FaFileInvoice, FaArrowLeft, FaShoppingCart, FaBox, FaEuroSign } from 'react-icons/fa';
import '../styles/OrderReview.css';

const OrderReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const orderData = location.state || {};
  const { orderId, seriePedido, deliveryDate, items = [], comment } = orderData;

  if (!orderId) {
    navigate('/mis-pedidos');
    return null;
  }

  // Calcular el subtotal correcto (PrecioVenta * Cantidad)
  const calcularSubtotal = () => {
    return items.reduce((sum, item) => {
      const precio = parseFloat(item.PrecioVenta) || parseFloat(item.PrecioCompra) || 0;
      const cantidad = parseFloat(item.Cantidad) || 0;
      return sum + (precio * cantidad);
    }, 0);
  };

  // NO usar el total que viene del estado, calcularlo siempre
  const subtotalPedido = calcularSubtotal();

  return (
    <div className="orw-container">
      <div className="orw-card">
        <div className="orw-header">
          <div className="orw-icon-container">
            <FaFileInvoice className="orw-main-icon" />
          </div>
          <h2 className="orw-title">Confirmación de Pedido</h2>
          <div className="orw-success-icon">
            <FaCheckCircle />
          </div>
        </div>
        
        <div className="orw-content">
          <p className="orw-message">
            Su pedido <strong>#{seriePedido}-{orderId}</strong> ha sido registrado exitosamente.
          </p>

          <div className="orw-detalle-pedido">
            <h3>Detalle del Pedido</h3>
            
            <div className="orw-items-list">
              {items.map((item, index) => {
                const precio = parseFloat(item.PrecioVenta) || parseFloat(item.PrecioCompra) || 0;
                const cantidad = parseFloat(item.Cantidad) || 0;
                const totalLinea = precio * cantidad;
                
                return (
                  <div key={index} className="orw-item">
                    <div className="orw-item-header">
                      <FaBox className="orw-item-icon" />
                      <div className="orw-item-info">
                        <h4>{item.DescripcionArticulo}</h4>
                        <div className="orw-item-details">
                          <span><strong>Código:</strong> {item.CodigoArticulo}</span>
                          {item.Familia && <span><strong>Familia:</strong> {item.Familia}</span>}
                          <span><strong>Proveedor:</strong> {item.NombreProveedor || 'No especificado'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="orw-item-financial">
                      <div className="orw-item-pricing">
                        <span><strong>Precio:</strong> {precio.toFixed(2)} €</span>
                        <span><strong>Cantidad:</strong> {cantidad}</span>
                        <span className="orw-item-total">
                          <strong>Total:</strong> {totalLinea.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="orw-order-summary">
              <div className="orw-summary-item">
                <span><strong>Total de artículos:</strong></span>
                <span><strong>{items.length}</strong></span>
              </div>
              
              {deliveryDate && (
                <div className="orw-summary-item">
                  <FaCalendarCheck className="orw-delivery-icon" />
                  <span><strong>Fecha necesaria:</strong></span>
                  <span><strong>{new Date(deliveryDate).toLocaleDateString('es-ES')}</strong></span>
                </div>
              )}
              
              <div className="orw-summary-total">
                <span><strong>Importe total del pedido:</strong></span>
                <span className="orw-grand-total">
                  <FaEuroSign /> <strong>{subtotalPedido.toFixed(2)} €</strong>
                </span>
              </div>
            </div>

            {comment && (
              <div className="orw-comments">
                <h4>Observaciones del pedido:</h4>
                <p>{comment}</p>
              </div>
            )}
          </div>

          <p className="orw-confirmation-message">
            Recibirá una confirmación por correo electrónico con los detalles de su pedido.
          </p>
        </div>
        
        <div className="orw-actions">
          <button 
            onClick={() => navigate('/crear-pedido')} 
            className="orw-button orw-primary-button"
          >
            <FaShoppingCart />
            Nuevo Pedido
          </button>
          <button 
            onClick={() => navigate('/mis-pedidos')} 
            className="orw-button orw-secondary-button"
          >
            <FaArrowLeft />
            Ver Historial
          </button>
        </div>

        <div className="orw-footer">
          <p className="orw-footer-text">
            ¿Necesita ayuda? <a href="mailto:soporte@empresa.com" className="orw-footer-link">Contacte con soporte</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderReview;