import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      } else {
        setError(data.message || 'Error al cargar los detalles del pedido');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Error al cargar los detalles del pedido');
    }
  };

  // Función para generar claves únicas
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
    return <div className="admin-container">Acceso restringido. Se requieren permisos de administrador.</div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Panel de Administración - Pedidos Pendientes</h1>
        <div className="header-actions">
          <button onClick={fetchPendingOrders} className="refresh-btn">
            Actualizar lista
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Cargando pedidos...</div>
      ) : (
        <>
          <div className="orders-summary">
            <p>Total de pedidos pendientes: <strong>{orders.length}</strong></p>
          </div>
          
          <div className="orders-table-container">
            {orders.length === 0 ? (
              <p className="no-orders">No hay pedidos pendientes de aprobación.</p>
            ) : (
              <table className="orders-table">
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
                    <tr key={order.NumeroPedido}>
                      <td>{order.NumeroPedido}</td>
                      <td>{formatDate(order.FechaPedido)}</td>
                      <td>{order.RazonSocial}</td>
                      <td>{order.CifDni}</td>
                      <td>{order.NumeroLineas}</td>
                      <td>{formatCurrency(order.BaseImponible)}</td>
                      <td>{formatDate(order.FechaNecesaria)}</td>
                      <td>
                        <button 
                          onClick={() => fetchOrderDetails(order.NumeroPedido)}
                          className="details-btn"
                        >
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
      
      {selectedOrder && (
        <div className="order-modal">
          <div className="modal-content">
            <h2>Detalles del Pedido #{selectedOrder.NumeroPedido}</h2>
            
            <div className="order-info-grid">
              <div className="info-card">
                <h3>Información del cliente</h3>
                <div className="info-row">
                  <span className="info-label">Nombre:</span>
                  <span>{selectedOrder.RazonSocial}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">CIF/DNI:</span>
                  <span>{selectedOrder.CifDni}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Dirección:</span>
                  <span>{selectedOrder.Domicilio}, {selectedOrder.CodigoPostal} {selectedOrder.Municipio}, {selectedOrder.Provincia}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Fecha necesaria:</span>
                  <span>{formatDate(selectedOrder.FechaNecesaria)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Observaciones:</span>
                  <span>{selectedOrder.ObservacionesPedido || 'Ninguna'}</span>
                </div>
              </div>
            </div>
            
            <h3 className="products-title">Productos</h3>
            <div className="products-table-container">
              <table className="products-table">
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
                  {selectedOrder.Productos && selectedOrder.Productos.map((product, index) => (
                    <tr key={generateProductKey(product, index)}>
                      <td>{product.CodigoArticulo}</td>
                      <td>{product.DescripcionArticulo}</td>
                      <td>{product.UnidadesPedidas}</td>
                      <td>{formatCurrency(product.Precio)}</td>
                      <td>{product.NombreProveedor || 'No especificado'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={() => {
                  setSelectedOrder(null);
                }}
                className="cancel-btn"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;