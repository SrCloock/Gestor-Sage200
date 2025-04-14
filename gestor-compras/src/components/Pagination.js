import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center',
      margin: '1rem 0'
    }}>
      <button 
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Anterior
      </button>
      
      <span style={{ margin: '0 1rem' }}>
        Página {currentPage} de {totalPages}
      </span>
      
      <button 
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Siguiente
      </button>
    </div>
  );
};

export default Pagination;