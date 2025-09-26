import React from 'react';
import { FaFilter, FaTimes } from 'react-icons/fa';
import '../styles/FiltrosAvanzados.css';

const FiltrosAvanzados = ({ 
  filtros, 
  onFiltroChange, 
  opcionesFamilias, 
  opcionesSubfamilias,
  onLimpiarFiltros 
}) => {
  return (
    <div className="fa-container">
      <div className="fa-header">
        <FaFilter className="fa-icon" />
        <h4>Filtros Avanzados</h4>
        <button onClick={onLimpiarFiltros} className="fa-limpiar-btn">
          <FaTimes /> Limpiar
        </button>
      </div>

      <div className="fa-filtros-grid">
        <div className="fa-filtro-group">
          <label>Familia:</label>
          <select 
            name="familia" 
            value={filtros.familia} 
            onChange={onFiltroChange}
            className="fa-select"
          >
            <option value="">Todas las familias</option>
            {opcionesFamilias.map((familia, index) => (
              <option key={index} value={familia}>{familia}</option>
            ))}
          </select>
        </div>

        <div className="fa-filtro-group">
          <label>Subfamilia:</label>
          <select 
            name="subfamilia" 
            value={filtros.subfamilia} 
            onChange={onFiltroChange}
            className="fa-select"
            disabled={!filtros.familia}
          >
            <option value="">Todas las subfamilias</option>
            {opcionesSubfamilias
              .filter(sub => sub.familia === filtros.familia)
              .map((sub, index) => (
                <option key={index} value={sub.valor}>{sub.valor}</option>
              ))
            }
          </select>
        </div>
      </div>
    </div>
  );
};

export default FiltrosAvanzados;