import React, { useState } from 'react';

const ProductSearch = ({ products, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    const filtered = searchTerm
      ? products.filter(p =>
          p.NombreArticulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.CodigoArticulo.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : products;
    onSearch(filtered);
  };

  return (
    <div className="product-search">
      <input
        type="text"
        placeholder="Buscar productos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button onClick={handleSearch}>Buscar</button>
    </div>
  );
};

export default ProductSearch;