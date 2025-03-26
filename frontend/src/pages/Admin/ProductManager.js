import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct, updateProduct } from '../../services/productService';
import Button from '../../components/UI/Button';
import Notification from '../../components/UI/Notification';

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (error) {
        showNotification('Error al cargar productos', 'error');
      }
    };
    loadProducts();
  }, []);

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productData = Object.fromEntries(formData);

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.CodigoArticulo, productData);
        showNotification('Producto actualizado', 'success');
      } else {
        await createProduct(productData);
        showNotification('Producto creado', 'success');
      }
      setEditingProduct(null);
      e.target.reset();
    } catch (error) {
      showNotification('Error al guardar producto', 'error');
    }
  };

  return (
    <div className="product-manager">
      <h2>Gestión de Productos</h2>
      
      {notification && (
        <Notification 
          type={notification.type} 
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Código:</label>
          <input 
            name="CodigoArticulo" 
            defaultValue={editingProduct?.CodigoArticulo || ''}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Nombre:</label>
          <input 
            name="NombreArticulo" 
            defaultValue={editingProduct?.NombreArticulo || ''}
            required
          />
        </div>

        <div className="form-group">
          <label>Precio:</label>
          <input 
            type="number" 
            name="Precio" 
            step="0.01"
            defaultValue={editingProduct?.Precio || ''}
            required
          />
        </div>

        <Button type="submit" primary>
          {editingProduct ? 'Actualizar' : 'Crear'}
        </Button>
      </form>

      <div className="product-list">
        <h3>Listado de Productos</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.CodigoArticulo}>
                <td>{product.CodigoArticulo}</td>
                <td>{product.NombreArticulo}</td>
                <td>€{product.Precio.toFixed(2)}</td>
                <td>
                  <Button onClick={() => setEditingProduct(product)}>
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManager;