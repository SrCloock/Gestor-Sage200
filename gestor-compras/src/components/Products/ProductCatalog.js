import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import './ProductCatalog.css';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Función para generar un key único
  const generateUniqueKey = (base) => `${base}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/api/products');
        // Añadir un key único a cada producto
        const productsWithKeys = response.data.map(product => ({
          ...product,
          uniqueKey: generateUniqueKey(product.CodigoArticulo)
        }));
        setProducts(productsWithKeys);
      } catch (err) {
        setError('Error al cargar los productos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToOrder = (product) => {
    navigate('/crear-pedido', { 
      state: { 
        selectedProduct: product,
        fromCatalog: true 
      } 
    });
  };

  if (loading) return <div className="loading">Cargando productos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="product-catalog">
      <h2>Catálogo de Productos</h2>
      <div className="product-grid">
        {products.map(product => (
          <div 
            key={product.uniqueKey}  // Usamos el key único generado
            className="product-card"
          >
            <h3>{product.DescripcionArticulo}</h3>
            <div className="product-details">
              <p><strong>Proveedor:</strong> {product.NombreProveedor}</p>
              <p><strong>Precio:</strong> {product.PrecioCompra.toFixed(2)} €</p>
              <p><strong>Código:</strong> {product.CodigoArticulo}</p>
            </div>
            <button 
              onClick={() => handleAddToOrder(product)}
              className="add-button"
            >
              Añadir al pedido
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductCatalog;