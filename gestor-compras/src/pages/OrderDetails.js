import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { StoreContext } from "../context";
import jsPDF from "jspdf";
import "../styles/orderDetails.css";

// Función para formatear fechas
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Función para formatear números como moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

const OrderDetails = () => {
  const { orderId } = useParams();
  const { orders, isLoading, error } = useContext(StoreContext);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!orders.length) return;
    const order = orders.find((order) => order.id.toString() === orderId);
    setSelectedOrder(order);
  }, [orders, orderId]);

  // Generación de PDF con jsPDF
  const generatePDF = (order) => {
    const doc = new jsPDF();
    const margin = 15;
    const logo = "/images/logo.png";
    const logoWidth = 40;
    const logoHeight = 40;

    doc.addImage(logo, "PNG", margin, margin, logoWidth, logoHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Factura de Pedido", margin + logoWidth + 10, margin + 10);
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 50, 200, margin + 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Pedido #${order.id.toString()}`, margin, 60);
    doc.text(`Fecha: ${formatDate(order.date)}`, margin, 70);
    doc.text(`Estado: ${order.status}`, margin, 80);
    doc.text(`Total: ${formatCurrency(order.total)}`, margin, 90);

    doc.setLineWidth(0.5);
    doc.line(margin, 95, 200, 95);

    doc.setFont("helvetica", "bold");
    doc.text("Productos:", margin, 105);

    const tableHeaders = ["Producto", "Cantidad", "Precio Unitario", "Total"];
    const tableData = order.items.map((item) => [
      item.name,
      item.quantity.toString(),
      formatCurrency(item.price),
      formatCurrency(item.quantity * item.price),
    ]);

    const startY = 115;
    const rowHeight = 10;

    doc.setFont("helvetica", "bold");
    tableHeaders.forEach((header, index) => {
      doc.text(header, margin + index * 45, startY);
    });

    order.items.forEach((item, index) => {
      const y = startY + rowHeight * (index + 1);
      tableData[index].forEach((data, dataIndex) => {
        doc.setFont("helvetica", "normal");
        doc.text(data, margin + dataIndex * 45, y);
      });
    });

    doc.setLineWidth(0.5);
    doc.line(margin, startY + rowHeight * (order.items.length + 1), 200, startY + rowHeight * (order.items.length + 1));

    doc.setFont("helvetica", "bold");
    doc.text("¡Gracias por tu compra!", margin, startY + rowHeight * (order.items.length + 2));

    doc.save(`pedido_${order.id}.pdf`);
  };

  if (isLoading) return <p className="loading-message">Cargando...</p>;
  if (error) return <p className="error-message">Hubo un error al cargar los detalles del pedido.</p>;
  if (!selectedOrder) return <p className="error-message">No se encontró el pedido.</p>;

  return (
    <div className="order-details-container">
      <h3 className="order-title">Detalles del Pedido #{selectedOrder.id}</h3>
      <div className="order-details-card">
        <div className="order-header">
          <p><strong>Fecha:</strong> {formatDate(selectedOrder.date)}</p>
          <p><strong>Estado:</strong> {selectedOrder.status}</p>
          <p><strong>Total:</strong> {formatCurrency(selectedOrder.total)}</p>
        </div>
        <div className="order-items">
          <h4>Productos:</h4>
          <ul>
            {selectedOrder.items.map((item) => (
              <li key={item.productId}>
                <div className="item-detail">
                  <span className="item-name">{item.name}</span>
                  <span className="item-quantity">x {item.quantity}</span>
                  <span className="item-price">{formatCurrency(item.price)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <button onClick={() => generatePDF(selectedOrder)} className="download-pdf-btn">
          Descargar PDF
        </button>
      </div>
    </div>
  );
};

export default OrderDetails;
