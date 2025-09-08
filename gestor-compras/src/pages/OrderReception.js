import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import '../styles/OrderReception.css';

const OrderReception = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [order, setOrder] = useState(null);
  const [receptionItems, setReceptionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchOrderReception = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/reception/${orderId}`);
        
        if (response.data.success) {
          setOrder(response.data.order);
          const items = response.data.order.Productos.map(product => ({
            ...product,
            UnidadesRecibidas: product.UnidadesRecibidas || product.UnidadesPedidas,
            ComentarioRecepcion: product.ComentarioRecepcion || ''
          }));
          setReceptionItems(items);
        } else {
          setError(response.data.message || 'Error al cargar el pedido');
        }
      } catch (err) {
        console.error('Error fetching order reception:', err);
        setError('Error al cargar los datos del pedido');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderReception();
  }, [orderId]);

  const handleQuantityChange = (index, value) => {
    const newItems = [...receptionItems];
    const unidadesPedidas = newItems[index].UnidadesPedidas;
    const nuevasUnidades = Math.max(0, Math.min(parseInt(value) || 0, unidadesPedidas));
    
    newItems[index].UnidadesRecibidas = nuevasUnidades;
    setReceptionItems(newItems);
  };

  const handleCommentChange = (index, value) => {
    const newItems = [...receptionItems];
    newItems[index].ComentarioRecepcion = value;
    setReceptionItems(newItems);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      const response = await api.post(`/api/reception/${orderId}/confirm`, {
        items: receptionItems
      });
      
      if (response.data.success) {
        setSuccess('Recepción confirmada correctamente');
        setOrder({
          ...order,
          Estado: 2
        });
        
        setTimeout(() => {
          navigate(`/mis-pedidos/${orderId}`);
        }, 2000);
      } else {
        setError(response.data.message || 'Error al confirmar la recepción');
      }
    } catch (err) {
      console.error('Error confirming reception:', err);
      setError('Error al confirmar la recepción');
    } finally {
      setSubmitting(false);
    }
  };

  const getReceptionStatusText = (status) => {
    switch (status) {
      case 0: return 'Pendiente de recepción';
      case 2: return 'Servido';
      default: return 'Estado desconocido';
    }
  };

  if (loading) {
    return (
      <div className="orr-loading-container">
        <div className="orr-spinner"></div>
        <p>Cargando datos del pedido...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orr-error-container">
        <div className="orr-error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="orr-container">
      <div className="orr-header">
        <div className="orr-title-section">
          <h2>Confirmar Recepción del Pedido #{order.NumeroPedido}</h2>
          <div className="orr-status">
            Estado: <span className={`orr-status-badge orr-status-${order.Estado}`}>
              {getReceptionStatusText(order.Estado)}
            </span>
          </div>
        </div>
        <button onClick={() => navigate(`/mis-pedidos/${orderId}`)} className="orr-back-button">
          ← Volver al detalle
        </button>
      </div>

      <div className="orr-info-cards">
        <div className="orr-info-card">
          <div className="orr-card-icon">👤</div>
          <div className="orr-card-content">
            <h4>Cliente</h4>
            <p>{order.RazonSocial}</p>
          </div>
        </div>
        
        <div className="orr-info-card">
          <div className="orr-card-icon">📅</div>
          <div className="orr-card-content">
            <h4>Fecha de pedido</h4>
            <p>{new Date(order.FechaPedido).toLocaleDateString()}</p>
          </div>
        </div>
        
        {order.FechaNecesaria && (
          <div className="orr-info-card">
            <div className="orr-card-icon">🚚</div>
            <div className="orr-card-content">
              <h4>Fecha necesaria</h4>
              <p>{new Date(order.FechaNecesaria).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="orr-table-container">
        <div className="orr-table-header">
          <h3>Artículos del Pedido</h3>
          <p>Confirme las cantidades recibidas y agregue comentarios si es necesario</p>
        </div>
        
        <table className="orr-reception-table">
          <thead>
            <tr>
              <th>Artículo</th>
              <th>Código</th>
              <th>Pedido</th>
              <th>Recibido</th>
              <th>Comentarios</th>
            </tr>
          </thead>
          <tbody>
            {receptionItems.map((item, index) => (
              <tr key={index} className={item.UnidadesRecibidas !== item.UnidadesPedidas ? 'orr-partial-reception' : ''}>
                <td className="orr-item-description">{item.DescripcionArticulo}</td>
                <td className="orr-item-code">{item.CodigoArticulo}</td>
                <td className="orr-item-ordered">{item.UnidadesPedidas}</td>
                <td className="orr-item-received">
                  <input
                    type="number"
                    min="0"
                    max={item.UnidadesPedidas}
                    value={item.UnidadesRecibidas}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    disabled={order.Estado === 2}
                    className="orr-quantity-input"
                  />
                </td>
                <td className="orr-item-comments">
                  <input
                    type="text"
                    placeholder="Comentarios sobre la recepción"
                    value={item.ComentarioRecepcion}
                    onChange={(e) => handleCommentChange(index, e.target.value)}
                    disabled={order.Estado === 2}
                    className="orr-comment-input"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {success && (
        <div className="orr-success-message">
          <div className="orr-success-icon">✅</div>
          <p>{success}</p>
        </div>
      )}

      <div className="orr-actions">
        <button 
          onClick={() => navigate(`/mis-pedidos/${orderId}`)}
          className="orr-button orr-secondary-button"
        >
          Volver al detalle
        </button>
        
        {order.Estado !== 2 && (
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="orr-button orr-primary-button"
          >
            {submitting ? (
              <>
                <div className="orr-button-spinner"></div>
                Confirmando...
              </>
            ) : (
              'Confirmar Recepción'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderReception;