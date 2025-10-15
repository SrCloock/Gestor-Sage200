// components/CatalogFilters.js
import React, { useState, useEffect } from 'react';
import api from '../api';
import { FaFilter, FaTimes } from 'react-icons/fa';
import '../styles/CatalogFilters.css';

const CatalogFilters = ({ filters, onFiltersChange }) => {
  const [proveedores, setProveedores] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await api.get('/catalog/filters');
        if (response.data.success) {
          setProveedores(response.data.filters.proveedores);
        }
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };

    fetchFilters();
  }, []);

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      proveedor: '',
      precioMin: '',
      precioMax: ''
    });
  };

  const hasActiveFilters = filters.proveedor || filters.precioMin || filters.precioMax;

  return (
    <div className="catalog-filters">
      <div className="filters-header">
        <button 
          className="filters-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FaFilter />
          Filtros
          {hasActiveFilters && <span className="active-filters-dot"></span>}
        </button>
        
        {hasActiveFilters && (
          <button className="clear-filters" onClick={clearFilters}>
            <FaTimes />
            Limpiar
          </button>
        )}
      </div>

      {showFilters && (
        <div className="filters-content">
          <div className="filter-group">
            <label>Proveedor</label>
            <select
              value={filters.proveedor}
              onChange={(e) => handleFilterChange('proveedor', e.target.value)}
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map(proveedor => (
                <option key={proveedor.CodigoProveedor} value={proveedor.CodigoProveedor}>
                  {proveedor.NombreProveedor}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Precio Mínimo</label>
            <input
              type="number"
              placeholder="0.00"
              value={filters.precioMin}
              onChange={(e) => handleFilterChange('precioMin', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="filter-group">
            <label>Precio Máximo</label>
            <input
              type="number"
              placeholder="9999.99"
              value={filters.precioMax}
              onChange={(e) => handleFilterChange('precioMax', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogFilters;