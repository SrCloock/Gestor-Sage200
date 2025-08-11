import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import '../styles/OrderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/api/orders', {
          params: {
            codigoCliente: user?.codigoCliente,
            seriePedido: 'Web'
          }
        });
        setOrders(response.data.orders);
      } catch (err) {
        setError('Error al cargar los pedidos');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.codigoCliente) {
      fetchOrders();
    }
  }, [user]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.NumeroPedido.toString().toLowerCase().includes(term)
      );
    }
    
    result.sort((a, b) => {
      const dateA = new Date(a.FechaPedido);
      const dateB = new Date(b.FechaPedido);
      
      switch(sortBy) {
        case 'recent': return dateB - dateA;
        case 'oldest': return dateA - dateB;
        case 'id-asc': return a.NumeroPedido - b.NumeroPedido;
        case 'id-desc': return b.NumeroPedido - a.NumeroPedido;
        default: return dateB - dateA;
      }
    });
    
    return result;
  }, [searchTerm, sortBy, orders]);

  // Handlers
  const handleViewDetails = (orderId, seriePedido) => {
    navigate(`/mis-pedidos/${orderId}`, { state: { seriePedido } });
  };

  const handleEditOrder = (orderId, seriePedido) => {
    navigate(`/editar-pedido/${orderId}`, { state: { seriePedido } });
  };

  if (loading) return (
    <div className="ol-loading">
      <div className="ol-spinner"></div>
      <p>Cargando pedidos...</p>
    </div>
  );

  if (error) return (
    <div className="ol-error">
      <div className="ol-error-icon">!</div>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="ol-container">
      <h2 className="ol-title">Historial de Pedidos</h2>
      
      <div className="ol-controls">
        <div className="ol-search-box">
          <input
            type="text"
            placeholder="Buscar por #Pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ol-search-input"
          />
          <span className="ol-search-icon">🔍</span>
        </div>
        
        <div className="ol-sort-options">
          <label className="ol-sort-label">Ordenar por:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="ol-sort-select"
          >
            <option value="recent">Más recientes primero</option>
            <option value="oldest">Más antiguos primero</option>
            <option value="id-asc">#Pedido (ascendente)</option>
            <option value="id-desc">#Pedido (descendente)</option>
          </select>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="ol-no-orders">
          <div className="ol-no-orders-icon">📭</div>
          <h3>No se encontraron pedidos</h3>
          <p>No hay pedidos que coincidan con los filtros aplicados</p>
        </div>
      ) : (
        <div className="ol-orders-table-container">
          <table className="ol-orders-table">
            <thead>
              <tr>
                <th>#Pedido</th>
                <th>Fecha Pedido</th>
                <th>Fecha Entrega</th>
                <th>Artículos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={`${order.SeriePedido}-${order.NumeroPedido}`} className="ol-order-row">
                  <td className="ol-order-id">{order.NumeroPedido}</td>
                  <td className="ol-order-date">{new Date(order.FechaPedido).toLocaleDateString()}</td>
                  <td className="ol-delivery-date">
                    {order.FechaNecesaria 
                      ? new Date(order.FechaNecesaria).toLocaleDateString() 
                      : 'No especificada'}
                  </td>
                  <td className="ol-items-count">{order.NumeroLineas}</td>
                  <td>
                    <span className={`ol-status-badge ${order.Estado === 'Aprobado' ? 'ol-approved' : 'ol-pending'}`}>
                      {order.Estado || 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <div className="ol-actions-container">
                      <button 
                        onClick={() => handleViewDetails(order.NumeroPedido, order.SeriePedido)}
                        className="ol-view-button"
                      >
                        Ver Detalle
                      </button>
                      {order.Estado === 'Pendiente' && (
                        <button 
                          onClick={() => handleEditOrder(order.NumeroPedido, order.SeriePedido)}
                          className="ol-edit-button"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderList;