import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import '../styles/OrderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const getStatusText = (order) => {
    if (order.StatusAprobado === 0) return 'Revisando';
    if (order.StatusAprobado === -1) {
      if (order.Estado === 2) return 'Servido';
      if (order.Estado === 0) {
        // Si EsParcial es -1, entonces es Parcial
        return order.EsParcial === -1 ? 'Parcial' : 'Preparando';
      }
    }
    return 'Desconocido';
  };

  const canEditOrder = (order) => {
    return order.StatusAprobado === 0;
  };

  useEffect(() => {
    if (location.state?.success) {
      alert(location.state.message);
      window.history.replaceState({}, document.title);
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await api.get('/orders', {
          params: { codigoCliente: user?.codigoCliente }
        });
        
        console.log('📦 Datos recibidos de /orders:', response.data);
        
        if (response.data.success) {
          setOrders(response.data.orders || []);
          
          // Log para debug: mostrar el primer pedido con sus campos
          if (response.data.orders && response.data.orders.length > 0) {
            console.log('📊 Primer pedido:', {
              NumeroPedido: response.data.orders[0].NumeroPedido,
              StatusAprobado: response.data.orders[0].StatusAprobado,
              Estado: response.data.orders[0].Estado,
              EsParcial: response.data.orders[0].EsParcial,
              StatusText: getStatusText(response.data.orders[0])
            });
          }
        } else {
          setError(response.data.message || 'Error al cargar pedidos');
        }
      } catch (err) {
        console.error('❌ Error en fetchOrders:', err);
        if (err.response?.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else if (err.code === 'NETWORK_ERROR') {
          setError('Error de conexión con el servidor.');
        } else {
          setError('Error al cargar los pedidos');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.codigoCliente) {
      fetchOrders();
    } else {
      setError('No se pudo identificar el cliente');
      setLoading(false);
    }
  }, [user, location.state]);

  let filteredOrders = [...orders];
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredOrders = filteredOrders.filter(order => 
      order.NumeroPedido.toString().includes(term)
    );
  }
  
  if (statusFilter) {
    filteredOrders = filteredOrders.filter(order => {
      const statusText = getStatusText(order).toLowerCase();
      return statusText.includes(statusFilter.toLowerCase());
    });
  }

  filteredOrders.sort((a, b) => {
    const dateA = new Date(a.FechaPedido);
    const dateB = new Date(b.FechaPedido);
    
    switch(sortBy) {
      case 'recent': return dateB - dateA;
      case 'oldest': return dateA - dateB;
      case 'amount-asc': return (a.ImporteLiquido || 0) - (b.ImporteLiquido || 0);
      case 'amount-desc': return (b.ImporteLiquido || 0) - (a.ImporteLiquido || 0);
      case 'id-asc': return a.NumeroPedido - b.NumeroPedido;
      case 'id-desc': return b.NumeroPedido - a.NumeroPedido;
      default: return dateB - dateA;
    }
  });

  const handleViewDetails = (orderId) => {
    navigate(`/mis-pedidos/${orderId}`);
  };

  const handleEditOrder = (orderId) => {
    const order = orders.find(o => o.NumeroPedido === orderId);
    if (order && canEditOrder(order)) {
      navigate(`/editar-pedido/${orderId}`);
    }
  };

  // Función para calcular el subtotal de un pedido
  const calcularSubtotal = (order) => {
    const productos = order.Productos || [];
    return productos.reduce((sum, product) => {
      const precio = product.Precio || product.PrecioVenta || 0;
      const cantidad = product.UnidadesPedidas || 0;
      return sum + (precio * cantidad);
    }, 0);
  };

  if (loading) return (
    <div className="ol-loading-container">
      <div className="ol-spinner"></div>
      <p>Cargando pedidos...</p>
    </div>
  );

  if (error) return (
    <div className="ol-error-container">
      <div className="ol-error-icon">⚠️</div>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="ol-retry-button">
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="ol-container">
      <div className="ol-header">
        <div className="ol-title-section">
          <h2 className="ol-title">Historial de Pedidos</h2>
          <p className="ol-subtitle">Gestiona y revisa tus pedidos realizados</p>
        </div>
      </div>

      <div className="ol-controls-panel">
        <div className="ol-search-container">
          <input
            type="text"
            placeholder="Buscar por #Pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ol-search-input"
          />
          <span className="ol-search-icon">🔍</span>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="ol-clear-search"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="ol-filter-container">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ol-filter-select"
          >
            <option value="">Todos los estados</option>
            <option value="revisando">Revisando</option>
            <option value="preparando">Preparando</option>
            <option value="parcial">Parcial</option>
            <option value="servido">Servido</option>
          </select>
        </div>
        
        <div className="ol-filter-container">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="ol-filter-select"
          >
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="id-asc">#Pedido (ascendente)</option>
            <option value="id-desc">#Pedido (descendente)</option>
            <option value="amount-asc">Importe (ascendente)</option>
            <option value="amount-desc">Importe (descendente)</option>
          </select>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="ol-empty-state">
          <div className="ol-empty-icon">📭</div>
          <h3>No se encontraron pedidos</h3>
          <p>No hay pedidos que coincidan con los filtros aplicados</p>
          <button 
            onClick={() => { setSearchTerm(''); setStatusFilter(''); }} 
            className="ol-clear-filters"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="ol-table-container">
          <table className="ol-orders-table">
            <thead>
              <tr>
                <th>#Pedido</th>
                <th>Fecha Pedido</th>
                <th>Artículos</th>
                <th>Importe</th>
                <th>Status</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const statusText = getStatusText(order);
                const editable = canEditOrder(order);
                const subtotal = calcularSubtotal(order);
                
                return (
                  <tr key={order.NumeroPedido} className="ol-table-row">
                    <td className="ol-order-id">#{order.NumeroPedido}</td>
                    <td className="ol-order-date">
                      {new Date(order.FechaPedido).toLocaleDateString('es-ES')}
                    </td>
                    <td className="ol-items-count">{order.NumeroLineas}</td>
                    <td className="ol-order-amount">
                      {subtotal.toFixed(2)} €
                    </td>
                    <td>
                      <span className={`ol-status-badge ol-status-${statusText.toLowerCase()}`}>
                        {statusText}
                      </span>
                    </td>
                    <td>
                      <div className="ol-actions">
                        <button 
                          onClick={() => handleViewDetails(order.NumeroPedido)}
                          className="ol-btn ol-btn-primary"
                        >
                          Ver Detalle
                        </button>
                        {editable && (
                          <button 
                            onClick={() => handleEditOrder(order.NumeroPedido)}
                            className="ol-btn ol-btn-secondary"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderList;