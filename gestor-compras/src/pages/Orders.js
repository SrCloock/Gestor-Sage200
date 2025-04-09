import { useContext, useMemo, useState, useEffect } from "react";
import { StoreContext } from "../context";
import OrderItem from "../components/OrderItem";
import { Link } from "react-router-dom";
import "../styles/orders.css";

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

const Orders = () => {
  const { orders, isLoading, error, companies } = useContext(StoreContext); // Añadimos 'companies' para vincular la razón social
  const [searchProvider, setSearchProvider] = useState(""); // Filtro por proveedor
  const [searchProduct, setSearchProduct] = useState(""); // Filtro por nombre de producto
  const [searchCompany, setSearchCompany] = useState(""); // Filtro por Código Empresa
  const [sortOrder, setSortOrder] = useState("asc"); // Orden (A-Z por defecto)

  // Función de filtro de pedidos
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Filtro por nombre de proveedor
        const matchesProvider = order.proveedorNombre.toLowerCase().includes(searchProvider.toLowerCase());
        // Filtro por nombre de producto
        const matchesProduct = order.productoNombre.toLowerCase().includes(searchProduct.toLowerCase());
        // Filtro por código de empresa
        const matchesCompany = order.codigoEmpresa.toString().includes(searchCompany.toString());

        return matchesProvider && matchesProduct && matchesCompany;
      })
      .sort((a, b) => {
        if (sortOrder === "asc") {
          return a.productoNombre.localeCompare(b.productoNombre);
        } else {
          return b.productoNombre.localeCompare(a.productoNombre);
        }
      });
  }, [orders, searchProvider, searchProduct, searchCompany, sortOrder]);

  const renderStatusMessage = useMemo(() => {
    if (isLoading) {
      return <div className="loading-spinner">Cargando...</div>;
    }

    if (error) {
      return <p className="error-message">Hubo un error al cargar tus pedidos. Intenta nuevamente más tarde.</p>;
    }

    if (filteredOrders.length === 0) {
      return <p className="empty-message">No has realizado ningún pedido aún.</p>;
    }

    return filteredOrders.map((order) => {
      // Aquí vinculamos con el código de empresa y razón social
      const company = companies.find((comp) => comp.codigoEmpresa === order.codigoEmpresa);
      
      return (
        <Link to={`/order-details/${order.id}`} key={order.id} className="order-summary">
          <div className="order-header">
            <span className="order-company">
              {company ? company.razonSocial : "Empresa Desconocida"} - {company ? company.codigoEmpresa : "N/A"}
            </span>
          </div>
          <OrderItem order={order} />
        </Link>
      );
    });
  }, [filteredOrders, isLoading, error, companies]);

  return (
    <div className="orders-container">
      <h2 className="orders-title">Historial de Pedidos</h2>

      {/* Filtros de búsqueda */}
      <div className="filters">
        <input
          type="text"
          placeholder="Buscar por proveedor"
          value={searchProvider}
          onChange={(e) => setSearchProvider(e.target.value)}
        />
        <input
          type="text"
          placeholder="Buscar por nombre de producto"
          value={searchProduct}
          onChange={(e) => setSearchProduct(e.target.value)}
        />
        <input
          type="text"
          placeholder="Buscar por código de empresa"
          value={searchCompany}
          onChange={(e) => setSearchCompany(e.target.value)}
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="asc">De la A a la Z</option>
          <option value="desc">De la Z a la A</option>
        </select>
      </div>

      {renderStatusMessage}
    </div>
  );
};

export default Orders;
