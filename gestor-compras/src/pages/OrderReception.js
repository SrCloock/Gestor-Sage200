import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../components/orderService';
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
        // ✅ Corregido: se elimina el "/api"
        const response = await api.get(`/reception/${orderId}`);
        
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
    
    if (nuevasUnidades !== unidadesPedidas && !newItems[index].ComentarioRecepcion) {
      newItems[index].ComentarioRecepcion = `Cantidad modificada: recibidas ${nuevasUnidades} de ${unidadesPedidas} pedidas`;
    }
    
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
      
      const itemsWithDifferences = receptionItems.filter(item => 
        item.UnidadesRecibidas !== item.UnidadesPedidas && !item.ComentarioRecepcion.trim()
      );
      
      if (itemsWithDifferences.length > 0) {
        const itemCodes = itemsWithDifferences.map(item => item.CodigoArticulo).join(', ');
        setError(`Debe agregar comentarios para los artículos: ${itemCodes} ya que la cantidad recibida difiere de la pedida`);
        setSubmitting(false);
        return;
      }

      // ✅ Corregido: se elimina el "/api"
      const response = await api.post(`/reception/${orderId}/confirm`, {
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
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error al confirmar la recepción');
      }
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

  if (error && !order) {
    return (
      <div className="orr-error-container">
        <div className="orr-error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={() => navigate('/mis-pedidos')} className="orr-back-button">
          Volver al historial
        </button>
      </div>
    );
  }

  return (
    <div className="orr-container">
      <div className="orr-header">
        <div className="orr-title-section">
          <h2>Confirmar Recepción del Pedido #{order?.NumeroPedido}</h2>
          <div className="orr-status">
            Estado: <span className={`orr-status-badge orr-status-${order?.Estado}`}>
              {getReceptionStatusText(order?.Estado)}
            </span>
          </div>
        </div>
        <button onClick={() => navigate(`/mis-pedidos/${orderId}`)} className="orr-back-button">
          ← Volver al detalle
        </button>
      </div>

      {error && (
        <div className="orr-error-message">
          <div className="orr-error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      )}

      <div className="orr-info-cards">
        <div className="orr-info-card">
          <div className="orr-card-icon">👤</div>
          <div className="orr-card-content">
            <h4>Cliente</h4>
            <p>{order?.RazonSocial}</p>
          </div>
        </div>
        
        <div className="orr-info-card">
          <div className="orr-card-icon">📅</div>
          <div className="orr-card-content">
            <h4>Fecha de pedido</h4>
            <p>{order?.FechaPedido ? new Date(order.FechaPedido).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
        
        {order?.FechaNecesaria && (
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
          <p className="orr-warning-text">
            ⚠️ <strong>Importante:</strong> Si la cantidad recibida es diferente a la pedida, debe agregar un comentario explicando la diferencia.
          </p>
        </div>
        
        <table className="orr-reception-table">
          <thead>
            <tr>
              <th>Artículo</th>
              <th>Código</th>
              <th>Pedido</th>
              <th>Recibido</th>
              <th>Comentarios</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {receptionItems.map((item, index) => {
              const hasDifference = item.UnidadesRecibidas !== item.UnidadesPedidas;
              const needsComment = hasDifference && !item.ComentarioRecepcion.trim();
              
              return (
                <tr key={index} className={`${hasDifference ? 'orr-partial-reception' : ''} ${needsComment ? 'orr-needs-comment' : ''}`}>
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
                      disabled={order?.Estado === 2}
                      className="orr-quantity-input"
                    />
                  </td>
                  <td className="orr-item-comments">
                    <textarea
                      placeholder={hasDifference ? "Explique la diferencia en cantidades..." : "Comentarios sobre la recepción"}
                      value={item.ComentarioRecepcion}
                      onChange={(e) => handleCommentChange(index, e.target.value)}
                      disabled={order?.Estado === 2}
                      className="orr-comment-input"
                      rows="2"
                    />
                    {needsComment && (
                      <span className="orr-comment-warning">⚠️ Comentario requerido</span>
                    )}
                  </td>
                  <td className="orr-item-status">
                    {item.UnidadesRecibidas === item.UnidadesPedidas ? (
                      <span className="orr-status-complete">✅ Completo</span>
                    ) : item.UnidadesRecibidas === 0 ? (
                      <span className="orr-status-pending">⏳ Pendiente</span>
                    ) : (
                      <span className="orr-status-partial">⚠️ Parcial</span>
                    )}
                  </td>
                </tr>
              );
            })}
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
        
        {order?.Estado !== 2 && (
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