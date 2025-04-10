import React, { useState, useEffect } from 'react';
import { useStore } from '../context';
import ProductCard from '../components/ProductCard';
import '../styles/products.css';

const Products = () => {
  const { products, isLoading, error, addToCart } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name-asc');
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    let result = [...products];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.supplier.toLowerCase().includes(term)
      );
    }
    
    // Filtrar por categoría (si se implementa)
    if (filter !== 'all') {
      result = result.filter(p => p.category === filter);
    }
    
    // Ordenar
    result.sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        default:
          return 0;
      }
    });
    
    setFilteredProducts(result);
  }, [products, searchTerm, filter, sort]);

  if (isLoading) return <div className="loading">Cargando productos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="products-container">
      <div className="products-header">
        <h2>Catálogo de Productos</h2>
        
        <div className="products-controls">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todos</option>
            {/* Opciones de categoría si están disponibles */}
          </select>
          
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name-asc">Nombre (A-Z)</option>
            <option value="name-desc">Nombre (Z-A)</option>
            <option value="price-asc">Precio (Menor a Mayor)</option>
            <option value="price-desc">Precio (Mayor a Menor)</option>
          </select>
        </div>
      </div>
      
      <div className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAddToCart={addToCart}
            />
          ))
        ) : (
          <div className="no-results">
            No se encontraron productos que coincidan con los filtros
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;