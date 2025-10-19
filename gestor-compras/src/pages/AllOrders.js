import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaTimes, FaSync, FaEye, FaFilter } from 'react-icons/fa';
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
  const [sorting, setSorting] = useState({ 
    field: 'FechaPedido', 
    direction: 'DESC' 
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchAllOrders();
    }
  }, [user, filters, sorting, pagination.page, pagination.limit]);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ordenarPor: sorting.field,
        orden: sorting.direction,
        ...(filters.numeroPedido && { numeroPedido: filters.numeroPedido }),
        ...(filters.cliente && { cliente: filters.cliente }),
        ...(filters.importeMin && { importeMin: filters.importeMin }),
        ...(filters.importeMax && { importeMax: filters.importeMax }),
        ...(filters.estado && { estado: filters.estado })
      }).toString();

      // CORREGIDO: Usar fetch en lugar de api.get para mejor control de errores
      const response = await fetch(`/api/admin/all-orders?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`El servidor devolvió HTML en lugar de JSON: ${text.substring(0, 100)}...`);
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } else {
        setError(data.message || 'Error al cargar pedidos');
      }
    } catch (error) {
      console.error('Error fetching all orders:', error);
      setError(error.message || 'Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getStatusText = (order) => {
    if (order.StatusAprobado === 0) return 'Revisando';
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

  const getStatusBadgeClass = (order) => {
    const status = getStatusText(order);
    switch (status) {
      case 'Servido': return 'ao-status-servido';
      case 'Preparando': return 'ao-status-preparando';
      case 'Parcial': return 'ao-status-parcial';
      case 'Revisando': return 'ao-status-pendiente';
      default: return 'ao-status-desconocido';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES');
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // CORREGIDO: Navegación para admin y usuario normal
  const handleViewDetails = (orderId) => {
    // Para admin, usar ruta específica de admin
    if (user?.isAdmin) {
      navigate(`/admin/orders/${orderId}`);
    } else {
      navigate(`/mis-pedidos/${orderId}`);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
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

  const handleSort = (field) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'ASC' ? 'DESC' : 'ASC'
    }));
  };

  const renderSortIcon = (field) => {
    if (sorting.field !== field) return <FaSort className="ao-sort-icon" />;
    return sorting.direction === 'ASC' ? 
      <FaSortUp className="ao-sort-icon" /> : 
      <FaSortDown className="ao-sort-icon" />;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleLimitChange = (newLimit) => {
    setPagination({
      page: 1,
      limit: parseInt(newLimit),
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / parseInt(newLimit))
    });
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Botón Primera Página
    buttons.push(
      <button
        key="first"
        onClick={() => handlePageChange(1)}
        disabled={pagination.page === 1}
        className="ao-pagination-btn"
      >
        «
      </button>
    );

    // Botón Página Anterior
    buttons.push(
      <button
        key="prev"
        onClick={() => handlePageChange(pagination.page - 1)}
        disabled={pagination.page === 1}
        className="ao-pagination-btn"
      >
        ‹
      </button>
    );

    // Botones de páginas numéricas
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`ao-pagination-btn ${pagination.page === i ? 'ao-pagination-active' : ''}`}
        >
          {i}
        </button>
      );
    }

    // Botón Página Siguiente
    buttons.push(
      <button
        key="next"
        onClick={() => handlePageChange(pagination.page + 1)}
        disabled={pagination.page === pagination.totalPages}
        className="ao-pagination-btn"
      >
        ›
      </button>
    );

    // Botón Última Página
    buttons.push(
      <button
        key="last"
        onClick={() => handlePageChange(pagination.totalPages)}
        disabled={pagination.page === pagination.totalPages}
        className="ao-pagination-btn"
      >
        »
      </button>
    );

    return buttons;
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  if (!user || !user.isAdmin) {
    return (
      <div className="ao-container">
        <div className="ao-access-denied">
          <FaTimes className="ao-denied-icon" />
          <h2>Acceso restringido</h2>
          <p>Se requieren permisos de administrador para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ao-container">
      <div className="ao-header">
        <div className="ao-title-section">
          <h1>Todos los Pedidos</h1>
          <p>Gestión completa de pedidos de todos los clientes</p>
        </div>
        <div className="ao-header-actions">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="ao-filter-btn"
          >
            <FaFilter className="ao-filter-icon" />
            Filtros
          </button>
          <button onClick={fetchAllOrders} className="ao-refresh-btn">
            <FaSync className="ao-refresh-icon" />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="ao-error-message">
          <div className="ao-error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={() => setError('')} className="ao-error-close">
            <FaTimes />
          </button>
        </div>
      )}

      {/* Panel de Filtros */}
      {showFilters && (
        <div className="ao-filters-panel">
          <h3>Filtrar Pedidos</h3>
          <div className="ao-filters-grid">
            <div className="ao-filter-group">
              <label>Nº Pedido:</label>
              <input
                type="text"
                name="numeroPedido"
                value={filters.numeroPedido}
                onChange={handleFilterChange}
                placeholder="Buscar por número"
              />
            </div>

            <div className="ao-filter-group">
              <label>Cliente:</label>
              <input
                type="text"
                name="cliente"
                value={filters.cliente}
                onChange={handleFilterChange}
                placeholder="Buscar por cliente"
              />
            </div>

            <div className="ao-filter-group">
              <label>Importe Mín:</label>
              <input
                type="number"
                name="importeMin"
                value={filters.importeMin}
                onChange={handleFilterChange}
                placeholder="Importe mínimo"
                step="0.01"
              />
            </div>

            <div className="ao-filter-group">
              <label>Importe Máx:</label>
              <input
                type="number"
                name="importeMax"
                value={filters.importeMax}
                onChange={handleFilterChange}
                placeholder="Importe máximo"
                step="0.01"
              />
            </div>

            <div className="ao-filter-group">
              <label>Estado:</label>
              <select
                name="estado"
                value={filters.estado}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="0">Revisando</option>
                <option value="-1">Aprobado</option>
              </select>
            </div>
          </div>

          <div className="ao-filters-actions">
            <button onClick={fetchAllOrders} className="ao-apply-btn">
              Aplicar Filtros
            </button>
            <button onClick={clearFilters} className="ao-clear-btn">
              Limpiar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="ao-loading">
          <div className="ao-spinner"></div>
          <p>Cargando pedidos...</p>
        </div>
      ) : (
        <>
          <div className="ao-table-container">
            {orders.length === 0 ? (
              <div className="ao-empty-state">
                <div className="ao-empty-icon">📭</div>
                <h3>No hay pedidos</h3>
                <p>No se encontraron pedidos con los filtros aplicados.</p>
              </div>
            ) : (
              <table className="ao-orders-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('NumeroPedido')} className="ao-sortable-header">
                      <span>Nº Pedido</span>
                      {renderSortIcon('NumeroPedido')}
                    </th>
                    <th onClick={() => handleSort('FechaPedido')} className="ao-sortable-header">
                      <span>Fecha</span>
                      {renderSortIcon('FechaPedido')}
                    </th>
                    <th onClick={() => handleSort('RazonSocial')} className="ao-sortable-header">
                      <span>Cliente</span>
                      {renderSortIcon('RazonSocial')}
                    </th>
                    <th>CIF/DNI</th>
                    <th onClick={() => handleSort('NumeroLineas')} className="ao-sortable-header">
                      <span>Líneas</span>
                      {renderSortIcon('NumeroLineas')}
                    </th>
                    <th onClick={() => handleSort('ImporteLiquido')} className="ao-sortable-header">
                      <span>Importe</span>
                      {renderSortIcon('ImporteLiquido')}
                    </th>
                    <th>Status</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.NumeroPedido} className="ao-order-row">
                      <td className="ao-order-id">{order.NumeroPedido}</td>
                      <td className="ao-order-date">{formatDate(order.FechaPedido)}</td>
                      <td className="ao-order-client">{order.RazonSocial}</td>
                      <td className="ao-order-cif">{order.CifDni}</td>
                      <td className="ao-order-lines">{order.NumeroLineas}</td>
                      <td className="ao-order-amount">
                        {formatCurrency(order.ImporteLiquido || 0)}
                      </td>
                      <td className="ao-order-status">
                        <span className={`ao-status-badge ${getStatusBadgeClass(order)}`}>
                          {getStatusText(order)}
                        </span>
                      </td>
                      <td className="ao-order-actions">
                        <button 
                          onClick={() => handleViewDetails(order.NumeroPedido)}
                          className="ao-view-btn"
                        >
                          <FaEye />
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {orders.length > 0 && (
            <div className="ao-pagination">
              <div className="ao-pagination-info">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} pedidos
              </div>
              
              <div className="ao-pagination-controls">
                {renderPaginationButtons()}
              </div>
              
              <div className="ao-items-por-pagina">
                <label>Mostrar:</label>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(e.target.value)}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
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