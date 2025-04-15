import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductCatalog.css';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/products');
        setProducts(response.data);
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
    navigate('/crear-pedido', { state: { selectedProduct: product } });
  };

  if (loading) return <div className="loading">Cargando productos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="product-catalog">
      <h2>Catálogo de Productos</h2>
      <div className="product-grid">
        {products.map(product => (
          <div key={product.CodigoArticulo} className="product-card">
            <h3>{product.DescripcionArticulo}</h3>
            <p>Proveedor: {product.NombreProveedor}</p>
            <p>Precio: {product.PrecioCompra} €</p>
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