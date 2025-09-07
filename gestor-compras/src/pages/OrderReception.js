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
          // Inicializar los items para recepción
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
        // Actualizar el estado local
        setOrder({
          ...order,
          Estado: 2
        });
        
        // Redirigir después de 2 segundos
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
    return <div className="reception-loading">Cargando datos del pedido...</div>;
  }

  if (error) {
    return <div className="reception-error">{error}</div>;
  }

  return (
    <div className="reception-container">
      <div className="reception-header">
        <h2>Confirmar Recepción del Pedido #{order.NumeroPedido}</h2>
        <div className="reception-status">
          Estado: <span className={`status-${order.Estado}`}>
            {getReceptionStatusText(order.Estado)}
          </span>
        </div>
      </div>

      <div className="reception-info">
        <p><strong>Cliente:</strong> {order.RazonSocial}</p>
        <p><strong>Fecha de pedido:</strong> {new Date(order.FechaPedido).toLocaleDateString()}</p>
      </div>

      <div className="reception-table-container">
        <table className="reception-table">
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
              <tr key={index} className={item.UnidadesRecibidas !== item.UnidadesPedidas ? 'partial-reception' : ''}>
                <td>{item.DescripcionArticulo}</td>
                <td>{item.CodigoArticulo}</td>
                <td>{item.UnidadesPedidas}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max={item.UnidadesPedidas}
                    value={item.UnidadesRecibidas}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    disabled={order.Estado === 2}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Comentarios sobre la recepción"
                    value={item.ComentarioRecepcion}
                    onChange={(e) => handleCommentChange(index, e.target.value)}
                    disabled={order.Estado === 2}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {success && <div className="reception-success">{success}</div>}

      <div className="reception-actions">
        <button 
          onClick={() => navigate(`/mis-pedidos/${orderId}`)}
          className="back-button"
        >
          Volver al detalle
        </button>
        
        {order.Estado !== 2 && (
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="confirm-button"
          >
            {submitting ? 'Confirmando...' : 'Confirmar Recepción'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderReception;