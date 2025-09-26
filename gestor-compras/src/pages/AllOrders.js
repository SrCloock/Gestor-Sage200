import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaTimes, FaSync, FaEye } from 'react-icons/fa';
import '../styles/AllOrders.css';

const AllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    numeroPedido: '',
    cliente: '',
    importeMin: '',
    importeMax: '',
    estado: ''
  });
  const [sorting, setSorting] = useState({ field: 'FechaPedido', direction: 'DESC' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchAllOrders();
    }
  }, [user, filters, sorting, pagination.page, pagination.limit]);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ordenarPor: sorting.field,
        orden: sorting.direction,
        ...(filters.numeroPedido && { numeroPedido: filters.numeroPedido }),
        ...(filters.cliente && { cliente: filters.cliente }),
        ...(filters.importeMin && { importeMin: filters.importeMin }),
        ...(filters.importeMax && { importeMax: filters.importeMax }),
        ...(filters.estado && { estado: filters.estado })
      };

      const response = await api.get('/api/admin/all-orders', { params });
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      } else {
        setError(response.data.message || 'Error al cargar los pedidos');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (err.response?.status === 404) {
        setError('La ruta /api/admin/all-orders no fue encontrada. Verifique la configuración del servidor.');
      } else {
        setError('Error de conexión con el servidor. Verifique que el servidor esté ejecutándose.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'ASC' ? 'DESC' : 'ASC'
    }));
  };

  const clearFilters = () => {
    setFilters({
      numeroPedido: '',
      cliente: '',
      importeMin: '',
      importeMax: '',
      estado: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const getStatusText = (order) => {
    if (order.StatusAprobado === 0) return 'Pendiente';
    if (order.StatusAprobado === -1) {
      switch (order.Estado) {
        case 0: return 'Preparando';
        case 1: return 'Parcial';
        case 2: return 'Servido';
        default: return 'Preparando';
      }
    }
    return 'Desconocido';
  };

  const getStatusClass = (status) => {
    const statusText = getStatusText({ StatusAprobado: status.StatusAprobado, Estado: status.Estado });
    switch (statusText) {
      case 'Pendiente': return 'status-pending';
      case 'Preparando': return 'status-preparing';
      case 'Parcial': return 'status-partial';
      case 'Servido': return 'status-completed';
      default: return 'status-unknown';
    }
  };

  const getSortIcon = (field) => {
    if (sorting.field !== field) return <FaSort />;
    return sorting.direction === 'ASC' ? <FaSortUp /> : <FaSortDown />;
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="all-orders-container">
        <div className="access-denied">
          <FaTimes className="denied-icon" />
          <h2>Acceso restringido</h2>
          <p>Se requieren permisos de administrador para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="all-orders-container">
      <div className="header">
        <div className="title-section">
          <h1>Todos los Pedidos</h1>
          <p>Gestión completa de pedidos de todos los clientes</p>
        </div>
        <button onClick={fetchAllOrders} className="refresh-btn">
          <FaSync /> Actualizar
        </button>
      </div>
      
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Nº Pedido:</label>
            <input 
              type="text" 
              name="numeroPedido" 
              placeholder="Buscar por número..." 
              value={filters.numeroPedido}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Cliente:</label>
            <input 
              type="text" 
              name="cliente" 
              placeholder="Buscar cliente..." 
              value={filters.cliente}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Importe Mín:</label>
            <input 
              type="number" 
              name="importeMin" 
              placeholder="Mínimo" 
              value={filters.importeMin}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Importe Máx:</label>
            <input 
              type="number" 
              name="importeMax" 
              placeholder="Máximo" 
              value={filters.importeMax}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Estado:</label>
            <select name="estado" value={filters.estado} onChange={handleFilterChange}>
              <option value="">Todos los estados</option>
              <option value="0">Pendiente</option>
              <option value="-1">Aprobado</option>
              <option value="1">Parcial</option>
              <option value="2">Servido</option>
            </select>
          </div>
        </div>
        
        <div className="filter-actions">
          <button onClick={fetchAllOrders} className="search-btn">
            <FaSearch /> Buscar
          </button>
          <button onClick={clearFilters} className="clear-btn">
            Limpiar Filtros
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={fetchAllOrders} className="retry-btn">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando pedidos...</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('NumeroPedido')} className="sortable">
                    Nº Pedido {getSortIcon('NumeroPedido')}
                  </th>
                  <th onClick={() => handleSort('FechaPedido')} className="sortable">
                    Fecha {getSortIcon('FechaPedido')}
                  </th>
                  <th>Cliente</th>
                  <th onClick={() => handleSort('BaseImponible')} className="sortable">
                    Importe {getSortIcon('BaseImponible')}
                  </th>
                  <th>Fecha Necesaria</th>
                  <th onClick={() => handleSort('StatusAprobado')} className="sortable">
                    Estado {getSortIcon('StatusAprobado')}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No se encontraron pedidos
                    </td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.NumeroPedido}>
                      <td className="order-id">#{order.NumeroPedido}</td>
                      <td className="order-date">
                        {order.FechaPedido ? new Date(order.FechaPedido).toLocaleDateString('es-ES') : 'N/A'}
                      </td>
                      <td className="order-client">{order.RazonSocial || 'N/A'}</td>
                      <td className="order-amount">
                        {order.BaseImponible ? `${order.BaseImponible.toFixed(2)} €` : 'N/A'}
                      </td>
                      <td className="order-delivery">
                        {order.FechaNecesaria ? new Date(order.FechaNecesaria).toLocaleDateString('es-ES') : 'N/A'}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(order)}`}>
                          {getStatusText(order)}
                        </span>
                      </td>
                      <td className="order-actions">
                        <button className="view-btn">
                          <FaEye /> Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} pedidos
              </div>
              
              <div className="pagination-controls">
                <button 
                  onClick={() => handlePageChange(1)} 
                  disabled={pagination.page === 1}
                >
                  «
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)} 
                  disabled={pagination.page === 1}
                >
                  ‹
                </button>
                
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(
                    pagination.totalPages - 4,
                    pagination.page - 2
                  )) + i;
                  
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={pagination.page === pageNum ? 'active' : ''}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => handlePageChange(pagination.page + 1)} 
                  disabled={pagination.page === pagination.totalPages}
                >
                  ›
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.totalPages)} 
                  disabled={pagination.page === pagination.totalPages}
                >
                  »
                </button>
              </div>
              
              <div className="page-size">
                <select
                  value={pagination.limit}
                  onChange={(e) => setPagination(prev => ({ 
                    ...prev, 
                    limit: parseInt(e.target.value),
                    page: 1
                  }))}
                >
                  <option value="10">10 por página</option>
                  <option value="20">20 por página</option>
                  <option value="50">50 por página</option>
                  <option value="100">100 por página</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AllOrders;