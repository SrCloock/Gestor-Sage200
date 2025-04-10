import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../context';
import jsPDF from 'jspdf';
import api from '../services/api';
import '../styles/orderDetails.css';

const OrderDetails = () => {
  const { orderId } = useParams();
  const { state: locationState } = useLocation();
  const { user } = useStore();
  const [order, setOrder] = useState(locationState?.order || null);
  const [isLoading, setIsLoading] = useState(!locationState?.order);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (locationState?.order) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (!user?.CodigoEmpresa) {
          throw new Error('Información de usuario incompleta');
        }

        const response = await api.getOrderDetail(
          user.CodigoEmpresa,
          new Date().getFullYear(),
          'A',
          orderId
        );
        
        setOrder(response.data);
      } catch (err) {
        setError(err.message || 'Error al cargar el pedido');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [orderId, user, locationState]);

  const generatePDF = () => {
    if (!order) return;
    
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Detalle de Pedido', margin, margin + 10);
    
    // Información del pedido
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Número de Pedido: ${order.NumeroPedido}`, margin, margin + 20);
    doc.text(`Fecha: ${new Date(order.FechaPedido).toLocaleDateString()}`, margin, margin + 30);
    doc.text(`Estado: ${order.Estado}`, margin, margin + 40);
    doc.text(`Cliente: ${order.RazonSocial}`, margin, margin + 50);
    
    // Línea separadora
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 55, pageWidth - margin, margin + 55);
    
    // Detalles del pedido
    doc.setFont('helvetica', 'bold');
    doc.text('Productos', margin, margin + 65);
    
    doc.setFont('helvetica', 'normal');
    let y = margin + 75;
    
    order.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.NombreProducto || item.CodigoArticulo}`, margin, y);
      doc.text(`Cantidad: ${item.Cantidad}`, margin + 100, y);
      doc.text(`Precio: $${item.Precio?.toFixed(2) || '0.00'}`, margin + 150, y);
      y += 10;
    });
    
    // Total
    doc.setFont('helvetica', 'bold');
    const total = order.items.reduce((sum, item) => sum + (item.Precio * item.Cantidad), 0);
    doc.text(`Total: $${total.toFixed(2)}`, margin, y + 20);
    
    // Guardar PDF
    doc.save(`pedido_${order.NumeroPedido}.pdf`);
  };

  if (isLoading) return <div className="loading">Cargando detalles...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!order) return <div className="not-found">Pedido no encontrado</div>;

  return (
    <div className="order-details-container">
      <button onClick={() => navigate(-1)} className="back-button">
        &larr; Volver
      </button>
      
      <div className="order-header">
        <h2>Pedido #{order.NumeroPedido}</h2>
        <button onClick={generatePDF} className="pdf-button">
          Descargar PDF
        </button>
      </div>
      
      <div className="order-info">
        <div className="info-row">
          <span className="label">Fecha:</span>
          <span>{new Date(order.FechaPedido).toLocaleDateString()}</span>
        </div>
        <div className="info-row">
          <span className="label">Estado:</span>
          <span className={`status ${order.Estado.toLowerCase()}`}>
            {order.Estado}
          </span>
        </div>
        <div className="info-row">
          <span className="label">Cliente:</span>
          <span>{order.RazonSocial}</span>
        </div>
        <div className="info-row">
          <span className="label">Total:</span>
          <span className="total">
            ${order.items.reduce((sum, item) => sum + (item.Precio * item.Cantidad), 0).toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="order-items">
        <h3>Productos</h3>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unitario</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index}>
                <td>{item.NombreProducto || item.CodigoArticulo}</td>
                <td>{item.Cantidad}</td>
                <td>${item.Precio?.toFixed(2) || '0.00'}</td>
                <td>${((item.Precio || 0) * item.Cantidad).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderDetails;