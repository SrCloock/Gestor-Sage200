import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProductById } from '../../services/productService';
import { useCart } from '../../context/CartContext';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const data = await fetchProductById(id);
        setProduct(data);
      } catch (err) {
        setError('Producto no encontrado');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="product-detail">
      <div className="product-image">
        <img 
          src={`/uploads/${product.CodigoArticulo}.jpg`} 
          alt={product.NombreArticulo}
          onError={(e) => e.target.src = '/placeholder.jpg'}
        />
      </div>
      
      <div className="product-info">
        <h1>{product.NombreArticulo}</h1>
        <p><strong>Código:</strong> {product.CodigoArticulo}</p>
        <p><strong>Proveedor:</strong> {product.NombreProveedor}</p>
        <p><strong>Precio:</strong> €{product.Precio.toFixed(2)}</p>
        
        <div className="product-actions">
          <Button 
            onClick={() => addToCart(product)}
            primary
          >
            Añadir al Carrito
          </Button>
        </div>

        <div className="product-description">
          <h3>Descripción</h3>
          <p>{product.Descripcion || 'No hay descripción disponible'}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;