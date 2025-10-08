import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FaSync, FaEye, FaCheckCircle, FaTimes, FaFilter, FaSort, FaSortUp, FaSortDown, FaTrash } from 'react-icons/fa';
import '../styles/AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editedOrder, setEditedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { user } = useContext(AuthContext);
  
  // Estados para filtros y paginación
  const [filtros, setFiltros] = useState({
    cliente: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  });
  
  const [ordenamiento, setOrdenamiento] = useState({
    campo: 'FechaPedido',
    direccion: 'DESC'
  });
  
  const [paginacion, setPaginacion] = useState({
    pagina: 1,
    porPagina: 10,
    total: 0,
    totalPaginas: 0
  });
  
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchPendingOrders();
    }
  }, [user, paginacion.pagina, paginacion.porPagina, ordenamiento, filtros]);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: paginacion.pagina,
        limit: paginacion.porPagina,
        ordenarPor: ordenamiento.campo,
        orden: ordenamiento.direccion,
        ...(filtros.cliente && { cliente: filtros.cliente }),
        ...(filtros.estado !== '' && { estado: filtros.estado }),
        ...(filtros.fechaDesde && { fechaDesde: filtros.fechaDesde }),
        ...(filtros.fechaHasta && { fechaHasta: filtros.fechaHasta })
      }).toString();

      const response = await fetch(`http://localhost:5000/api/admin/orders/pending?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`El servidor devolvió HTML en lugar de JSON: ${text.substring(0, 100)}...`);
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
        setPaginacion(prev => ({
          ...prev,
          total: data.paginacion.total,
          totalPaginas: data.paginacion.totalPaginas
        }));
      } else {
        setError(data.message || 'Error al cargar los pedidos');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Error de configuración del servidor. Contacte al administrador.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/orders/${orderId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSelectedOrder(data.order);
        setEditedOrder({
          ...data.order,
          Productos: data.order.Productos.map(product => ({ 
            ...product,
            // CORREGIDO: Usar PrecioVentaconIVA1 como prioridad, luego Precio
            PrecioFinal: product.PrecioVentaconIVA1 || product.Precio || 0
          }))
        });
      } else {
        setError(data.message || 'Error al cargar los detalles del pedido');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Error al cargar los detalles del pedido');
    }
  };

  const handleQuantityChange = (index, newQuantity) => {
    const updatedProducts = [...editedOrder.Productos];
    updatedProducts[index].UnidadesPedidas = Math.max(0, parseInt(newQuantity) || 0);
    setEditedOrder({
      ...editedOrder,
      Productos: updatedProducts
    });
  };

  // FUNCIÓN: Eliminar producto del pedido
  const handleRemoveProduct = (index) => {
    const updatedProducts = [...editedOrder.Productos];
    updatedProducts.splice(index, 1);
    setEditedOrder({
      ...editedOrder,
      Productos: updatedProducts
    });
  };

  const handleApproveOrder = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validar que hay al menos un producto con cantidad > 0
      const validProducts = editedOrder.Productos.filter(product => product.UnidadesPedidas > 0);
      
      // Si no hay productos válidos, enviar array vacío para eliminar el pedido
      const productsToSend = validProducts.length > 0 ? validProducts : [];

      const response = await fetch(`http://localhost:5000/api/admin/orders/${selectedOrder.NumeroPedido}/approve`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: productsToSend
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(data.message);
        fetchPendingOrders();
        setTimeout(() => {
          setSelectedOrder(null);
          setEditedOrder(null);
          setSuccessMessage('');
        }, 3000);
      } else {
        setError(data.message || 'Error al procesar el pedido');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      setError('Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const aplicarFiltros = () => {
    setPaginacion(prev => ({ ...prev, pagina: 1 }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      cliente: '',
      estado: '',
      fechaDesde: '',
      fechaHasta: ''
    });
    setPaginacion(prev => ({ ...prev, pagina: 1 }));
  };

  const cambiarOrdenamiento = (campo) => {
    if (ordenamiento.campo === campo) {
      setOrdenamiento(prev => ({
        campo,
        direccion: prev.direccion === 'ASC' ? 'DESC' : 'ASC'
      }));
    } else {
      setOrdenamiento({
        campo,
        direccion: 'DESC'
      });
    }
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina >= 1 && nuevaPagina <= paginacion.totalPaginas) {
      setPaginacion(prev => ({ ...prev, pagina: nuevaPagina }));
    }
  };

  const cambiarItemsPorPagina = (cantidad) => {
    setPaginacion(prev => ({ 
      ...prev, 
      porPagina: cantidad,
      pagina: 1
    }));
  };

  const generateProductKey = (product, index) => {
    return `${product.Orden}-${product.CodigoArticulo}-${product.CodigoProveedor || 'no-prov'}-${index}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  // FUNCIÓN CORREGIDA: Obtener el precio correcto del producto
  const getProductPrice = (product) => {
    // Priorizar PrecioVentaconIVA1, si no está disponible usar Precio
    return product.PrecioVentaconIVA1 || product.Precio || 0;
  };

  // FUNCIÓN NUEVA: Calcular el total por producto
  const calculateProductTotal = (product) => {
    const precio = getProductPrice(product);
    const cantidad = product.UnidadesPedidas || 0;
    return precio * cantidad;
  };

  // FUNCIÓN NUEVA: Calcular el total general del pedido (con IVA)
  const calculateOrderTotal = () => {
    if (!editedOrder || !editedOrder.Productos) return 0;
    return editedOrder.Productos.reduce((total, product) => {
      return total + calculateProductTotal(product);
    }, 0);
  };

  // FUNCIÓN NUEVA: Calcular el importe líquido (con IVA) para mostrar en la lista principal
  const getOrderTotalWithIVA = (order) => {
    // Si el pedido ya tiene ImporteLiquido, usarlo (ya incluye IVA)
    if (order.ImporteLiquido !== undefined && order.ImporteLiquido !== null) {
      return order.ImporteLiquido;
    }
    
    // Si no, calcularlo a partir de BaseImponible + IVA aproximado
    // Asumiendo un 21% de IVA si no tenemos el TotalIVA
    const base = order.BaseImponible || 0;
    const iva = order.TotalIVA || (base * 0.21);
    return base + iva;
  };

  const renderSortIcon = (campo) => {
    if (ordenamiento.campo !== campo) return <FaSort className="ao-sort-icon" />;
    return ordenamiento.direccion === 'ASC' 
      ? <FaSortUp className="ao-sort-icon" /> 
      : <FaSortDown className="ao-sort-icon" />;
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
          <h1>Panel de Administración</h1>
          <p>Gestión de pedidos pendientes de aprobación</p>
        </div>
        <div className="ao-header-actions">
          <button 
            onClick={() => setMostrarFiltros(!mostrarFiltros)} 
            className="ao-filter-btn"
          >
            <FaFilter className="ao-filter-icon" />
            Filtros
          </button>
          <button onClick={fetchPendingOrders} className="ao-refresh-btn">
            <FaSync className="ao-refresh-icon" />
            Actualizar
          </button>
        </div>
      </div>
      
      {error && (
        <div className="ao-error-message">
          <div className="ao-error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="ao-success-message">
          <FaCheckCircle className="ao-success-icon" />
          <p>{successMessage}</p>
        </div>
      )}
      
      {mostrarFiltros && (
        <div className="ao-filtros-panel">
          <h3>Filtrar Pedidos</h3>
          <div className="ao-filtros-grid">
            <div className="ao-filtro-group">
              <label>Cliente:</label>
              <input
                type="text"
                name="cliente"
                value={filtros.cliente}
                onChange={handleFiltroChange}
                placeholder="Buscar por nombre de cliente"
              />
            </div>
            
            <div className="ao-filtro-group">
              <label>Estado:</label>
              <select
                name="estado"
                value={filtros.estado}
                onChange={handleFiltroChange}
              >
                <option value="">Todos los estados</option>
                <option value="0">Pendiente</option>
                <option value="-1">Aprobado</option>
                <option value="1">Servido/Completado</option>
              </select>
            </div>
            
            <div className="ao-filtro-group">
              <label>Fecha desde:</label>
              <input
                type="date"
                name="fechaDesde"
                value={filtros.fechaDesde}
                onChange={handleFiltroChange}
              />
            </div>
            
            <div className="ao-filtro-group">
              <label>Fecha hasta:</label>
              <input
                type="date"
                name="fechaHasta"
                value={filtros.fechaHasta}
                onChange={handleFiltroChange}
              />
            </div>
          </div>
          
          <div className="ao-filtros-acciones">
            <button onClick={aplicarFiltros} className="ao-aplicar-btn">
              Aplicar Filtros
            </button>
            <button onClick={limpiarFiltros} className="ao-limpiar-btn">
              Limpiar Filtros
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
          <div className="ao-stats-cards">
            <div className="ao-stat-card">
              <div className="ao-stat-icon">📦</div>
              <div className="ao-stat-content">
                <span className="ao-stat-value">{paginacion.total}</span>
                <span className="ao-stat-label">Total pedidos</span>
              </div>
            </div>
            <div className="ao-stat-card">
              <div className="ao-stat-icon">⏳</div>
              <div className="ao-stat-content">
                <span className="ao-stat-value">{orders.filter(o => new Date(o.FechaNecesaria) < new Date()).length}</span>
                <span className="ao-stat-label">Urgentes</span>
              </div>
            </div>
            <div className="ao-stat-card">
              <div className="ao-stat-icon">✅</div>
              <div className="ao-stat-content">
                <span className="ao-stat-value">{orders.filter(o => o.StatusAprobado === -1).length}</span>
                <span className="ao-stat-label">Aprobados</span>
              </div>
            </div>
          </div>
          
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
                    <th>
                      <div className="ao-order-header" onClick={() => cambiarOrdenamiento('NumeroPedido')}>
                        Nº Pedido {renderSortIcon('NumeroPedido')}
                      </div>
                    </th>
                    <th>
                      <div className="ao-order-header" onClick={() => cambiarOrdenamiento('FechaPedido')}>
                        Fecha {renderSortIcon('FechaPedido')}
                      </div>
                    </th>
                    <th>
                      <div className="ao-order-header" onClick={() => cambiarOrdenamiento('RazonSocial')}>
                        Cliente {renderSortIcon('RazonSocial')}
                      </div>
                    </th>
                    <th>CIF/DNI</th>
                    <th>
                      <div className="ao-order-header" onClick={() => cambiarOrdenamiento('NumeroLineas')}>
                        Líneas {renderSortIcon('NumeroLineas')}
                      </div>
                    </th>
                    <th>
                      <div className="ao-order-header" onClick={() => cambiarOrdenamiento('BaseImponible')}>
                        Importe {renderSortIcon('BaseImponible')}
                      </div>
                    </th>
                    <th>
                      <div className="ao-order-header" onClick={() => cambiarOrdenamiento('FechaNecesaria')}>
                        Fecha necesaria {renderSortIcon('FechaNecesaria')}
                      </div>
                    </th>
                    <th>Estado</th>
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
                      {/* CORREGIDO: Mostrar ImporteLiquido (con IVA) en lugar de BaseImponible (sin IVA) */}
                      <td className="ao-order-amount">
                        {formatCurrency(getOrderTotalWithIVA(order))}
                      </td>
                      <td className="ao-order-delivery">
                        <span className={new Date(order.FechaNecesaria) < new Date() ? 'ao-urgent' : ''}>
                          {formatDate(order.FechaNecesaria)}
                        </span>
                      </td>
                      <td className="ao-order-status">
                        {order.StatusAprobado === 0 ? 'Pendiente' : 
                         order.StatusAprobado === -1 ? 'Aprobado' : 'Servido'}
                      </td>
                      <td className="ao-order-actions">
                        <button 
                          onClick={() => fetchOrderDetails(order.NumeroPedido)}
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
            <div className="ao-paginacion">
              <div className="ao-paginacion-info">
                Mostrando {((paginacion.pagina - 1) * paginacion.porPagina) + 1} - {Math.min(paginacion.pagina * paginacion.porPagina, paginacion.total)} de {paginacion.total} pedidos
              </div>
              
              <div className="ao-paginacion-controles">
                <button 
                  onClick={() => cambiarPagina(1)} 
                  disabled={paginacion.pagina === 1}
                >
                  «
                </button>
                <button 
                  onClick={() => cambiarPagina(paginacion.pagina - 1)} 
                  disabled={paginacion.pagina === 1}
                >
                  ‹
                </button>
                
                {[...Array(Math.min(5, paginacion.totalPaginas))].map((_, i) => {
                  const paginaNum = Math.max(1, Math.min(
                    paginacion.totalPaginas - 4,
                    paginacion.pagina - 2
                  )) + i;
                  
                  if (paginaNum > paginacion.totalPaginas) return null;
                  
                  return (
                    <button
                      key={paginaNum}
                      onClick={() => cambiarPagina(paginaNum)}
                      className={paginacion.pagina === paginaNum ? 'ao-pagina-activa' : ''}
                    >
                      {paginaNum}
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => cambiarPagina(paginacion.pagina + 1)} 
                  disabled={paginacion.pagina === paginacion.totalPaginas}
                >
                  ›
                </button>
                <button 
                  onClick={() => cambiarPagina(paginacion.totalPaginas)} 
                  disabled={paginacion.pagina === paginacion.totalPaginas}
                >
                  »
                </button>
              </div>
              
              <div className="ao-items-por-pagina">
                <label>Mostrar:</label>
                <select
                  value={paginacion.porPagina}
                  onChange={(e) => cambiarItemsPorPagina(parseInt(e.target.value))}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
      
      {selectedOrder && editedOrder && (
        <div className="ao-modal-overlay">
          <div className="ao-modal">
            <div className="ao-modal-header">
              <h2>Detalles del Pedido #{selectedOrder.NumeroPedido}</h2>
              <button 
                onClick={() => {
                  setSelectedOrder(null);
                  setEditedOrder(null);
                }}
                className="ao-close-btn"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="ao-modal-grid">
              <div className="ao-info-card">
                <div className="ao-card-header">
                  <h3>Información del cliente</h3>
                  <div className="ao-card-icon">👤</div>
                </div>
                <div className="ao-info-row">
                  <span className="ao-info-label">Nombre:</span>
                  <span className="ao-info-value">{selectedOrder.RazonSocial}</span>
                </div>
                <div className="ao-info-row">
                  <span className="ao-info-label">CIF/DNI:</span>
                  <span className="ao-info-value">{selectedOrder.CifDni}</span>
                </div>
                <div className="ao-info-row">
                  <span className="ao-info-label">Dirección:</span>
                  <span className="ao-info-value">
                    {selectedOrder.Domicilio}, {selectedOrder.CodigoPostal} {selectedOrder.Municipio}, {selectedOrder.Provincia}
                  </span>
                </div>
                <div className="ao-info-row">
                  <span className="ao-info-label">Fecha necesaria:</span>
                  <span className="ao-info-value">{formatDate(selectedOrder.FechaNecesaria)}</span>
                </div>
                <div className="ao-info-row">
                  <span className="ao-info-label">Observaciones:</span>
                  <span className="ao-info-value">{selectedOrder.ObservacionesPedido || 'Ninguna'}</span>
                </div>
              </div>
              
              {/* NUEVO: Card de resumen de totales */}
              <div className="ao-info-card">
                <div className="ao-card-header">
                  <h3>Resumen del Pedido</h3>
                  <div className="ao-card-icon">💰</div>
                </div>
                <div className="ao-info-row">
                  <span className="ao-info-label">Total Productos:</span>
                  <span className="ao-info-value">{editedOrder.Productos ? editedOrder.Productos.length : 0}</span>
                </div>
                <div className="ao-info-row">
                  <span className="ao-info-label">Total General:</span>
                  <span className="ao-info-value ao-total-amount">
                    {formatCurrency(calculateOrderTotal())}
                  </span>
                </div>
              </div>
            </div>
            
            <h3 className="ao-products-title">Productos</h3>
            <div className="ao-products-container">
              {editedOrder.Productos && editedOrder.Productos.length === 0 ? (
                <div className="ao-empty-products">
                  <div className="ao-empty-products-icon">📦</div>
                  <p>No hay productos en este pedido</p>
                  <p>Al aprobar, el pedido será eliminado automáticamente</p>
                </div>
              ) : (
                <table className="ao-products-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Precio Unitario</th>
                      <th>Total</th>
                      <th>Proveedor</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedOrder.Productos && editedOrder.Productos.map((product, index) => (
                      <tr key={generateProductKey(product, index)} className="ao-product-row">
                        <td className="ao-product-code">{product.CodigoArticulo}</td>
                        <td className="ao-product-desc">{product.DescripcionArticulo}</td>
                        <td className="ao-product-quantity">
                          <input
                            type="number"
                            value={product.UnidadesPedidas}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            min="0"
                            className="ao-quantity-input"
                          />
                        </td>
                        {/* CORREGIDO: Mostrar precio con IVA */}
                        <td className="ao-product-price">
                          {formatCurrency(getProductPrice(product))}
                        </td>
                        <td className="ao-product-total">
                          {formatCurrency(calculateProductTotal(product))}
                        </td>
                        <td className="ao-product-supplier">{product.NombreProveedor || 'No especificado'}</td>
                        <td className="ao-product-actions">
                          <button
                            onClick={() => handleRemoveProduct(index)}
                            className="ao-remove-btn"
                            title="Eliminar producto"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="ao-modal-actions">
              <button 
                onClick={handleApproveOrder}
                className="ao-approve-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="ao-button-spinner"></div>
                    Procesando...
                  </>
                ) : (
                  editedOrder.Productos && editedOrder.Productos.length > 0 
                    ? 'Aprobar Pedido y Generar Pedidos a Proveedores'
                    : 'Eliminar Pedido (Sin productos)'
                )}
              </button>
              <button 
                onClick={() => {
                  setSelectedOrder(null);
                  setEditedOrder(null);
                }}
                className="ao-cancel-btn"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;