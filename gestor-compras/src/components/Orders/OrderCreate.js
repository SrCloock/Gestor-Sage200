import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import './OrderCreate.css';

const OrderCreate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({ products: true, submit: false });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/api/products');
        setProducts(response.data);
      } catch (err) {
        setError('Error al cargar productos');
        console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, products: false }));
      }
    };

    fetchProducts();

    if (location.state?.selectedProduct) {
      setOrderItems([{
        ...location.state.selectedProduct,
        Cantidad: 1,
        CodigoCliente: user?.codigoCliente,
        CifDni: user?.cifDni
      }]);
    }
  }, [location, user]);

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
        return [...prev, { 
          ...product, 
          Cantidad: 1,
          CodigoCliente: user?.codigoCliente,
          CifDni: user?.cifDni
        }];
      }
    });
  };

  const handleSubmitOrder = async () => {
    try {
      setError('');
      setLoading(prev => ({ ...prev, submit: true }));

      if (!user?.codigoCliente || !user?.cifDni) {
        throw new Error('Datos de usuario incompletos. Por favor, inicie sesión nuevamente.');
      }

      const itemsToSend = orderItems.map(item => ({
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        Cantidad: Number(item.Cantidad), // El backend lo mapeará a UnidadesPedidas
        CodigoProveedor: item.CodigoProveedor,
        CodigoCliente: user.codigoCliente,
        CifDni: user.cifDni
      }));

      const response = await api.post('/api/orders', { items: itemsToSend });
      
      navigate('/revisar-pedido', { 
        state: { 
          orderId: response.data.orderId,
          success: true 
        } 
      });
    } catch (err) {
      console.error('Error al crear pedido:', {
        message: err.message,
        response: err.response?.data
      });
      setError(err.response?.data?.message || err.message || 'Error al crear el pedido');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  if (loading.products) return <div className="loading">Cargando productos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="order-create">
      <h2>Crear Nuevo Pedido</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="order-container">
        <div className="product-selection">
          <h3>Seleccionar Productos</h3>
          <div className="product-list">
            {products.map(product => (
              <div key={`${product.CodigoArticulo}-${product.CodigoProveedor}`} className="product-item">
                <h3>{product.DescripcionArticulo}</h3>
                <p>Proveedor: {product.NombreProveedor}</p>
                <button onClick={() => handleAddItem(product)}>Añadir</button>
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
                {orderItems.map((item, index) => (
                  <li key={`${item.CodigoArticulo}-${index}`}>
                    <div className="item-info">
                      <span>{item.DescripcionArticulo}</span>
                      <span>Proveedor: {item.NombreProveedor}</span>
                    </div>
                    <div className="item-actions">
                      <input
                        type="number"
                        value={item.Cantidad}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 1;
                          setOrderItems(prev =>
                            prev.map(i =>
                              i.CodigoArticulo === item.CodigoArticulo
                                ? { ...i, Cantidad: newValue }
                                : i
                            )
                          );
                        }}
                        min="1"
                      />
                      <button 
                        onClick={() => setOrderItems(prev => prev.filter(i => i.CodigoArticulo !== item.CodigoArticulo))}
                        className="remove-button"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSubmitOrder}
                className="submit-order"
                disabled={orderItems.length === 0 || loading.submit}
              >
                {loading.submit ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCreate;