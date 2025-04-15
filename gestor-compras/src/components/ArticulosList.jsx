import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ArticulosList = () => {
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchArticulos = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/articulos', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        setArticulos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticulos();
  }, []);

  if (loading) return <div>Cargando artículos...</div>;

  return (
    <div>
      <h2>Catálogo de Artículos</h2>
      <div className="articulos-grid">
        {articulos.map(articulo => (
          <div key={articulo.CodigoArticulo} className="articulo-card">
            <h3>{articulo.DescripcionArticulo}</h3>
            <p>Proveedor: {articulo.RazonSocial}</p>
            <p>Precio: {articulo.PrecioCompra} €</p>
            <button>Agregar al Pedido</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArticulosList;