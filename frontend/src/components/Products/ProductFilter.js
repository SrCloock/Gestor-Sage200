import React, { useState } from 'react';

const ProductFilter = ({ products, onFilter }) => {
  const [supplier, setSupplier] = useState('');

  const suppliers = [...new Set(products.map(p => p.NombreProveedor))];

  const handleFilter = () => {
    const filtered = supplier 
      ? products.filter(p => p.NombreProveedor === supplier)
      : products;
    onFilter(filtered);
  };

  return (
    <div className="product-filter">
      <select
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
      >
        <option value="">Todos los proveedores</option>
        {suppliers.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button onClick={handleFilter}>Filtrar</button>
    </div>
  );
};

export default ProductFilter;