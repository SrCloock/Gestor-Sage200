import React, { useState, useEffect } from 'react';
import { FaEye, FaCheck, FaArrowLeft, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import '../styles/AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modifiedQuantities, setModifiedQuantities] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/admin/orders/pending');
      
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('El servidor devolvió HTML en lugar de JSON:', textResponse.substring(0, 200));
        throw new Error('Error de configuración del servidor. Contacte al administrador.');
      }
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Datos recibidos de pedidos pendientes:', data);
      
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setError(data.message || 'Error al cargar pedidos');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'No se pudieron cargar los pedidos. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Error de configuración del servidor.');
      }
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Datos del pedido:', data);
      
      if (data.success) {
        setSelectedOrder(data.order);
        const initialQuantities = {};
        data.order.Productos.forEach(product => {
          initialQuantities[product.CodigoArticulo] = product.UnidadesPedidas;
        });
        setModifiedQuantities(initialQuantities);
      } else {
        setError(data.message || 'Error al cargar detalles del pedido');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Error al cargar detalles del pedido: ' + error.message);
    }
  };

  const handleQuantityChange = (codigoArticulo, newQuantity) => {
    setModifiedQuantities(prev => ({
      ...prev,
      [codigoArticulo]: parseInt(newQuantity) || 0
    }));
  };

  const approveOrder = async (orderId) => {
    try {
      const itemsToUpdate = selectedOrder.Productos.map(product => ({
        CodigoArticulo: product.CodigoArticulo,
        UnidadesPedidas: modifiedQuantities[product.CodigoArticulo] || product.UnidadesPedidas
      }));

      const response = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modifiedItems: itemsToUpdate })
      });

      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Error de configuración del servidor.');
      }

      const data = await response.json();
      if (data.success) {
        alert('Pedido aprobado correctamente. Se han generado las órdenes de compra.');
        setSelectedOrder(null);
        fetchPendingOrders();
      } else {
        alert('Error al aprobar el pedido: ' + data.message);
      }
    } catch (error) {
      console.error('Error approving order:', error);
      alert('Error al aprobar el pedido: ' + error.message);
    }
  };

  if (loading) return (
    <div className="admin-loading">
      <div className="admin-spinner"></div>
      <p>Cargando pedidos pendientes...</p>
    </div>
  );

  if (error) {
    return (
      <div className="admin-error">
        <div className="error-icon">
          <FaExclamationTriangle />
        </div>
        <h3>Error de conexión</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button className="btn-refresh" onClick={fetchPendingOrders}>
            <FaSync /> Reintentar
          </button>
          <button className="btn-support" onClick={() => window.location.href = 'mailto:soporte@empresa.com'}>
            Contactar soporte
          </button>
        </div>
        <div className="error-troubleshooting">
          <h4>Posibles soluciones:</h4>
          <ul>
            <li>Verifique que el servidor esté en ejecución</li>
            <li>Compruebe su conexión a internet</li>
            <li>Contacte al administrador del sistema</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-orders-container">
      <div className="admin-header">
        <h2 className="admin-orders-title">Pedidos Pendientes de Aprobación</h2>
        <div className="header-actions">
          <span className="orders-count">{orders.length} pedidos pendientes</span>
          <button className="btn-refresh" onClick={fetchPendingOrders}>
            <FaSync /> Actualizar
          </button>
        </div>
      </div>
      
      {selectedOrder ? (
        <OrderReview 
          order={selectedOrder} 
          modifiedQuantities={modifiedQuantities}
          onQuantityChange={handleQuantityChange}
          onApprove={approveOrder}
          onBack={() => setSelectedOrder(null)}
        />
      ) : (
        <OrdersList 
          orders={orders} 
          onViewOrder={viewOrderDetails}
          onRefresh={fetchPendingOrders}
        />
      )}
    </div>
  );
};

const OrdersList = ({ orders, onViewOrder, onRefresh }) => (
  <>
    {orders.length === 0 ? (
      <div className="no-pending-orders">
        <div className="empty-state">
          <FaCheck className="empty-icon" />
          <h3>No hay pedidos pendientes</h3>
          <p>Todos los pedidos han sido procesados.</p>
          <button className="btn-refresh" onClick={onRefresh}>
            <FaSync /> Actualizar
          </button>
        </div>
      </div>
    ) : (
      <div className="admin-orders-table-container">
        <table className="admin-orders-table">
          <thead>
            <tr>
              <th>Nº Pedido</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Artículos</th>
              <th>Total</th>
              <th>Fecha Entrega Solicitada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.NumeroPedido} className="admin-order-row">
                <td className="admin-order-id">{order.NumeroPedido}</td>
                <td className="admin-order-date">{new Date(order.FechaPedido).toLocaleDateString()}</td>
                <td>{order.RazonSocial}</td>
                <td className="admin-items-count">{order.NumeroLineas}</td>
                <td className="admin-total">{order.BaseImponible} €</td>
                <td className="admin-delivery-date">
                  {order.FechaNecesaria ? new Date(order.FechaNecesaria).toLocaleDateString() : 'No especificada'}
                </td>
                <td>
                  <div className="admin-actions-container">
                    <button 
                      className="admin-view-button"
                      onClick={() => onViewOrder(order.NumeroPedido)}
                    >
                      <FaEye /> Revisar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </>
);

const OrderReview = ({ order, modifiedQuantities, onQuantityChange, onApprove, onBack }) => {
  const productsBySupplier = {};
  order.Productos.forEach(product => {
    const supplier = product.NombreProveedor || 'Sin proveedor';
    if (!productsBySupplier[supplier]) {
      productsBySupplier[supplier] = [];
    }
    productsBySupplier[supplier].push(product);
  });

  return (
    <div className="order-review">
      <button className="btn-back" onClick={onBack}>
        <FaArrowLeft /> Volver a la lista
      </button>

      <div className="order-header">
        <h3>Revisión de Pedido #{order.NumeroPedido}</h3>
        <p className="order-date">Fecha: {new Date(order.FechaPedido).toLocaleDateString()}</p>
      </div>
      
      <div className="order-info">
        <div className="info-section">
          <h4>Información del Cliente</h4>
          <p><strong>Cliente:</strong> {order.RazonSocial}</p>
          <p><strong>CIF/DNI:</strong> {order.CifDni}</p>
          <p><strong>Dirección:</strong> {order.Domicilio}, {order.CodigoPostal} {order.Municipio}</p>
        </div>
        
        <div className="info-section">
          <h4>Detalles del Pedido</h4>
          <p><strong>Fecha entrega solicitada:</strong> {order.FechaNecesaria ? new Date(order.FechaNecesaria).toLocaleDateString() : 'No especificada'}</p>
          <p><strong>Observaciones:</strong> {order.ObservacionesPedido || 'Ninguna'}</p>
        </div>
      </div>

      <h4>Artículos del Pedido (agrupados por proveedor)</h4>
      
      {Object.entries(productsBySupplier).map(([supplier, products]) => (
        <div key={supplier} className="supplier-section">
          <h5>Proveedor: {supplier}</h5>
          <table className="items-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Cantidad Solicitada</th>
                <th>Cantidad Aprobada</th>
                <th>Precio Unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.CodigoArticulo}>
                  <td>{product.CodigoArticulo}</td>
                  <td>{product.DescripcionArticulo}</td>
                  <td>{product.UnidadesPedidas}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={modifiedQuantities[product.CodigoArticulo] || product.UnidadesPedidas}
                      onChange={(e) => onQuantityChange(product.CodigoArticulo, e.target.value)}
                      className="quantity-input"
                    />
                  </td>
                  <td>{product.Precio} €</td>
                  <td>{(product.Precio * (modifiedQuantities[product.CodigoArticulo] || product.UnidadesPedidas)).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="review-actions">
        <button 
          className="btn-approve"
          onClick={() => onApprove(order.NumeroPedido)}
        >
          <FaCheck /> Aprobar Pedido y Generar Órdenes de Compra
        </button>
      </div>
    </div>
  );
};

export default AdminOrders;