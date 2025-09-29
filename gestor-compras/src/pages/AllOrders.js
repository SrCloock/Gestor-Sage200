import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../components/orderService';
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

      console.log('Buscando todos los pedidos con params:', params);

      // URL corregida
      const response = await api.get('/admin/all-orders', { params });
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
        console.log('Pedidos cargados:', response.data.orders?.length);
      } else {
        setError(response.data.message || 'Error al cargar los pedidos');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (err.response?.status === 404) {
        setError('La ruta /admin/all-orders no fue encontrada. Verifique la configuración del servidor.');
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        setError('Error de conexión con el servidor. Verifique que el servidor esté ejecutándose.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error al cargar los pedidos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
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
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 0: return 'Pendiente';
      case -1: return 'Aprobado';
      default: return 'Desconocido';
    }
  };

  const renderSortIcon = (field) => {
    if (sorting.field !== field) return <FaSort />;
    return sorting.direction === 'ASC' ? <FaSortUp /> : <FaSortDown />;
  };

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
          <p>Vista completa de todos los pedidos del sistema</p>
        </div>
        <div className="ao-header-actions">
          <button onClick={fetchAllOrders} className="ao-refresh-btn">
            <FaSync className="ao-refresh-icon" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="ao-filters">
        <div className="ao-filter-group">
          <label>Nº Pedido:</label>
          <input
            type="number"
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
            placeholder="Buscar cliente"
          />
        </div>

        <div className="ao-filter-group">
          <label>Importe Mín:</label>
          <input
            type="number"
            name="importeMin"
            value={filters.importeMin}
            onChange={handleFilterChange}
            placeholder="0.00"
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
            placeholder="1000.00"
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
            <option value="0">Pendiente</option>
            <option value="-1">Aprobado</option>
          </select>
        </div>

        <button onClick={clearFilters} className="ao-clear-filters">
          <FaTimes /> Limpiar
        </button>
      </div>

      {loading && (
        <div className="ao-loading">
          <div className="ao-spinner"></div>
          <p>Cargando pedidos...</p>
        </div>
      )}

      {error && (
        <div className="ao-error">
          <p>{error}</p>
          <button onClick={fetchAllOrders}>Reintentar</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="ao-stats">
            <p>Mostrando {orders.length} de {pagination.total} pedidos</p>
          </div>

          <div className="ao-table-container">
            <table className="ao-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('NumeroPedido')}>
                    Nº Pedido {renderSortIcon('NumeroPedido')}
                  </th>
                  <th onClick={() => handleSort('FechaPedido')}>
                    Fecha {renderSortIcon('FechaPedido')}
                  </th>
                  <th onClick={() => handleSort('RazonSocial')}>
                    Cliente {renderSortIcon('RazonSocial')}
                  </th>
                  <th>CIF/DNI</th>
                  <th>Líneas</th>
                  <th onClick={() => handleSort('BaseImponible')}>
                    Importe {renderSortIcon('BaseImponible')}
                  </th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.NumeroPedido}>
                    <td>{order.NumeroPedido}</td>
                    <td>{formatDate(order.FechaPedido)}</td>
                    <td>{order.RazonSocial}</td>
                    <td>{order.CifDni}</td>
                    <td>{order.NumeroLineas}</td>
                    <td>{formatCurrency(order.BaseImponible)}</td>
                    <td>
                      <span className={`ao-status ao-status-${getStatusText(order.StatusAprobado).toLowerCase()}`}>
                        {getStatusText(order.StatusAprobado)}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="ao-view-btn"
                        onClick={() => console.log('Ver detalle:', order.NumeroPedido)}
                      >
                        <FaEye /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <div className="ao-empty">
                <p>No se encontraron pedidos</p>
              </div>
            )}
          </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="ao-pagination">
              <button
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Anterior
              </button>
              
              <span>Página {pagination.page} de {pagination.totalPages}</span>
              
              <button
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AllOrders;