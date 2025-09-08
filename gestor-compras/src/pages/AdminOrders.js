import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FaSync, FaEye, FaCheckCircle, FaTimes } from 'react-icons/fa';
import '../styles/AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editedOrder, setEditedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchPendingOrders();
    }
  }, [user]);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('http://localhost:5000/api/admin/orders/pending', {
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
          Productos: data.order.Productos.map(product => ({ ...product }))
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
    updatedProducts[index].UnidadesPedidas = parseInt(newQuantity) || 1;
    setEditedOrder({
      ...editedOrder,
      Productos: updatedProducts
    });
  };

  const handleApproveOrder = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`http://localhost:5000/api/admin/orders/${selectedOrder.NumeroPedido}/approve`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: editedOrder.Productos
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Pedido aprobado y convertido a pedidos de proveedor correctamente');
        fetchPendingOrders();
        setTimeout(() => {
          setSelectedOrder(null);
          setEditedOrder(null);
          setSuccessMessage('');
        }, 3000);
      } else {
        setError(data.message || 'Error al aprobar el pedido');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      setError('Error al aprobar el pedido');
    } finally {
      setLoading(false);
    }
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
                <span className="ao-stat-value">{orders.length}</span>
                <span className="ao-stat-label">Pedidos pendientes</span>
              </div>
            </div>
            <div className="ao-stat-card">
              <div className="ao-stat-icon">⏳</div>
              <div className="ao-stat-content">
                <span className="ao-stat-value">{orders.filter(o => new Date(o.FechaNecesaria) < new Date()).length}</span>
                <span className="ao-stat-label">Urgentes</span>
              </div>
            </div>
          </div>
          
          <div className="ao-table-container">
            {orders.length === 0 ? (
              <div className="ao-empty-state">
                <div className="ao-empty-icon">📭</div>
                <h3>No hay pedidos pendientes</h3>
                <p>Todos los pedidos han sido procesados correctamente.</p>
              </div>
            ) : (
              <table className="ao-orders-table">
                <thead>
                  <tr>
                    <th>Nº Pedido</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>CIF/DNI</th>
                    <th>Líneas</th>
                    <th>Importe</th>
                    <th>Fecha necesaria</th>
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
                      <td className="ao-order-amount">{formatCurrency(order.BaseImponible)}</td>
                      <td className="ao-order-delivery">
                        <span className={new Date(order.FechaNecesaria) < new Date() ? 'ao-urgent' : ''}>
                          {formatDate(order.FechaNecesaria)}
                        </span>
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
            </div>
            
            <h3 className="ao-products-title">Productos</h3>
            <div className="ao-products-container">
              <table className="ao-products-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Proveedor</th>
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
                          min="1"
                          className="ao-quantity-input"
                        />
                      </td>
                      <td className="ao-product-price">{formatCurrency(product.Precio)}</td>
                      <td className="ao-product-supplier">{product.NombreProveedor || 'No especificado'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  'Aprobar Pedido y Generar Pedidos a Proveedores'
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