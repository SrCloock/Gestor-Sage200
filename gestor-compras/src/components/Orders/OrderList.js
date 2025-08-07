import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import './OrderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/api/orders', {
          params: {
            codigoCliente: user?.codigoCliente,
            seriePedido: 'Web' // Añadir seriePedido a la solicitud
          }
        });
        setOrders(response.data.orders);
        setFilteredOrders(response.data.orders);
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

  useEffect(() => {
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
        case 'recent':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'id-asc':
          return a.NumeroPedido - b.NumeroPedido;
        case 'id-desc':
          return b.NumeroPedido - a.NumeroPedido;
        default:
          return dateB - dateA;
      }
    });
    
    setFilteredOrders(result);
  }, [searchTerm, sortBy, orders]);

  const handleViewDetails = (orderId, seriePedido) => {
    navigate(`/mis-pedidos/${orderId}`, { state: { seriePedido } });
  };

  const handleEditOrder = (orderId, seriePedido) => {
    navigate(`/editar-pedido/${orderId}`, { state: { seriePedido } });
  };

  if (loading) return <div className="loading">Cargando pedidos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="order-list-container">
      <h2>Historial de Pedidos</h2>
      
      <div className="order-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por #Pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="sort-options">
          <label>Ordenar por:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Más recientes primero</option>
            <option value="oldest">Más antiguos primero</option>
            <option value="id-asc">#Pedido (ascendente)</option>
            <option value="id-desc">#Pedido (descendente)</option>
          </select>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          No se encontraron pedidos con los filtros aplicados
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
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
                <tr key={`${order.SeriePedido}-${order.NumeroPedido}`}>
                  <td>{order.NumeroPedido}</td>
                  <td>{new Date(order.FechaPedido).toLocaleDateString()}</td>
                  <td>
                    {order.FechaNecesaria 
                      ? new Date(order.FechaNecesaria).toLocaleDateString() 
                      : 'No especificada'}
                  </td>
                  <td>{order.NumeroLineas}</td>
                  <td>
                    <span className={`status-badge ${order.Estado === 'Aprobado' ? 'approved' : 'pending'}`}>
                      {order.Estado || 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <div className="actions-container">
                      <button 
                        onClick={() => handleViewDetails(order.NumeroPedido, order.SeriePedido)}
                        className="view-button"
                      >
                        Ver Detalle
                      </button>
                      {order.Estado === 'Pendiente' && (
                        <button 
                          onClick={() => handleEditOrder(order.NumeroPedido, order.SeriePedido)}
                          className="edit-button"
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