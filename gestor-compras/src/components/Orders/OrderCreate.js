import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './OrderCreate.css';

const OrderCreate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si viene de seleccionar un producto, lo añadimos
    if (location.state?.selectedProduct) {
      setOrderItems([{
        ...location.state.selectedProduct,
        Cantidad: 1
      }]);
    }

    // Cargar todos los productos
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/products');
        setProducts(response.data);
      } catch (err) {
        console.error('Error al cargar productos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [location]);

  const handleAddItem = (product) => {
    setOrderItems(prev => {
      const existingItem = prev.find(item => item.CodigoArticulo === product.CodigoArticulo);
      if (existingItem) {
        return prev.map(item =>
          item.CodigoArticulo === product.CodigoArticulo
            ? { ...item, Cantidad: item.Cantidad + 1 }
            : item
        );
      } else {
        return [...prev, { ...product, Cantidad: 1 }];
      }
    });
  };

  const handleQuantityChange = (codigoArticulo, cantidad) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.CodigoArticulo === codigoArticulo
          ? { ...item, Cantidad: Math.max(1, cantidad) }
          : item
      )
    );
  };

  const handleRemoveItem = (codigoArticulo) => {
    setOrderItems(prev => prev.filter(item => item.CodigoArticulo !== codigoArticulo));
  };

  const handleSubmitOrder = async () => {
    try {
      const response = await axios.post(
        'http://localhost:5000/api/orders',
        { items: orderItems },
        { withCredentials: true }
      );
      
      navigate('/revisar-pedido', { state: { orderId: response.data.orderId } });
    } catch (err) {
      console.error('Error al crear pedido:', err);
      alert('Error al crear el pedido');
    }
  };

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="order-create">
      <h2>Crear Nuevo Pedido</h2>
      
      <div className="order-container">
        <div className="product-selection">
          <h3>Seleccionar Productos</h3>
          <div className="product-list">
            {products.map(product => (
              <div key={product.CodigoArticulo} className="product-item">
                <span>{product.DescripcionArticulo}</span>
                <button onClick={() => handleAddItem(product)}>+</button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="order-summary">
          <h3>Resumen del Pedido</h3>
          {orderItems.length === 0 ? (
            <p>No hay productos en el pedido</p>
          ) : (
            <>
              <ul className="order-items">
                {orderItems.map(item => (
                  <li key={item.CodigoArticulo}>
                    <div className="item-info">
                      <span>{item.DescripcionArticulo}</span>
                      <span>Proveedor: {item.NombreProveedor}</span>
                    </div>
                    <div className="item-actions">
                      <input
                        type="number"
                        value={item.Cantidad}
                        onChange={(e) => handleQuantityChange(item.CodigoArticulo, parseInt(e.target.value))}
                        min="1"
                      />
                      <span>{item.PrecioCompra * item.Cantidad} €</span>
                      <button onClick={() => handleRemoveItem(item.CodigoArticulo)}>×</button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="order-total">
                Total: {orderItems.reduce((sum, item) => sum + (item.PrecioCompra * item.Cantidad), 0)} €
              </div>
              <button 
                onClick={handleSubmitOrder}
                className="submit-order"
              >
                Confirmar Pedido
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCreate;