import React, { useState, useEffect } from 'react';
import { getProducts } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await getProducts(search);
      setProducts(data);
    };
    fetchProducts();
  }, [search]);

  return (
    <div>
      <h2>Catálogo de Productos</h2>
      <input
        type="text"
        placeholder="Buscar por proveedor o nombre"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul>
        {products.map((product) => (
          <li key={product.codigoArticulo}>{product.nombreArticulo}</li>
        ))}
      </ul>
    </div>
  );
};

export default Products;
