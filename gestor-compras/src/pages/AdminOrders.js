import React, { useState, useEffect } from 'react';
import { FaEye, FaCheck } from 'react-icons/fa';
import '../styles/AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders/pending');
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedOrder(data.order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const approveOrder = async (orderId, itemsToUpdate) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modifiedItems: itemsToUpdate })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Pedido aprobado correctamente');
        setSelectedOrder(null);
        fetchPendingOrders();
      }
    } catch (error) {
      console.error('Error approving order:', error);
    }
  };

  if (loading) return (
    <div className="admin-loading">
      <div className="admin-spinner"></div>
      <p>Cargando pedidos...</p>
    </div>
  );

  return (
    <div className="admin-orders-container">
      <h2 className="admin-orders-title">Pedidos Pendientes de Aprobación</h2>
      
      {selectedOrder ? (
        <OrderReview 
          order={selectedOrder} 
          onApprove={approveOrder}
          onBack={() => setSelectedOrder(null)}
        />
      ) : (
        <OrdersList 
          orders={orders} 
          onViewOrder={viewOrderDetails}
        />
      )}
    </div>
  );
};

const OrdersList = ({ orders, onViewOrder }) => (
  <div className="admin-orders-table-container">
    <table className="admin-orders-table">
      <thead>
        <tr>
          <th>Nº Pedido</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Artículos</th>
          <th>Total</th>
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
            <td>{order.BaseImponible} €</td>
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
);

const OrderReview = ({ order, onApprove, onBack }) => {
  const [modifiedItems, setModifiedItems] = useState({});

  const handleQuantityChange = (codigoArticulo, newQuantity) => {
    setModifiedItems(prev => ({
      ...prev,
      [codigoArticulo]: parseInt(newQuantity) || 0
    }));
  };

  const handleApprove = () => {
    const itemsToUpdate = order.Productos.map(product => ({
      CodigoArticulo: product.CodigoArticulo,
      UnidadesPedidas: modifiedItems[product.CodigoArticulo] ?? product.UnidadesPedidas
    }));
    
    onApprove(order.NumeroPedido, itemsToUpdate);
  };

  return (
    <div className="order-review">
      <button className="btn-back" onClick={onBack}>
        &larr; Volver
      </button>

      <h3>Revisión de Pedido #{order.NumeroPedido}</h3>
      
      <div className="order-info">
        <p><strong>Cliente:</strong> {order.RazonSocial}</p>
        <p><strong>Dirección:</strong> {order.Domicilio}, {order.CodigoPostal} {order.Municipio}</p>
        <p><strong>Fecha entrega solicitada:</strong> {order.FechaNecesaria ? new Date(order.FechaNecesaria).toLocaleDateString() : 'No especificada'}</p>
      </div>

      <h4>Artículos del Pedido</h4>
      <table className="items-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th>Proveedor</th>
            <th>Cantidad Solicitada</th>
            <th>Cantidad Aprobada</th>
            <th>Precio</th>
          </tr>
        </thead>
        <tbody>
          {order.Productos.map(product => (
            <tr key={product.CodigoArticulo}>
              <td>{product.CodigoArticulo}</td>
              <td>{product.DescripcionArticulo}</td>
              <td>{product.NombreProveedor}</td>
              <td>{product.UnidadesPedidas}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  defaultValue={product.UnidadesPedidas}
                  onChange={(e) => handleQuantityChange(product.CodigoArticulo, e.target.value)}
                />
              </td>
              <td>{product.Precio} €</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="review-actions">
        <button className="admin-view-button" onClick={handleApprove}>
          <FaCheck /> Aprobar Pedido
        </button>
      </div>
    </div>
  );
};

export default AdminOrders;