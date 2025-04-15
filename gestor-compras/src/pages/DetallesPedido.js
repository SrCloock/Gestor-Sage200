import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const DetallesPedido = () => {
  const [detalles, setDetalles] = useState([]);
  const location = useLocation();
  const pedido = location.state;

  useEffect(() => {
    const fetchDetalles = async () => {
      try {
        const params = new URLSearchParams({
          CodigoEmpresa: pedido.CodigoEmpresa,
          EjercicioPedido: pedido.EjercicioPedido,
          SeriePedido: pedido.SeriePedido,
          NumeroPedido: pedido.NumeroPedido,
        });

        const response = await fetch(`/api/pedidos/detalles?${params.toString()}`);
        const data = await response.json();
        setDetalles(data);
      } catch (error) {
        console.error('Error al obtener detalles del pedido:', error);
      }
    };

    fetchDetalles();
  }, [pedido]);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Detalles del Pedido</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Código Artículo</th>
            <th>Fecha Registro</th>
            <th>Fecha Pedido</th>
          </tr>
        </thead>
        <tbody>
          {detalles.map((detalle, index) => (
            <tr key={index}>
              <td>{detalle.CodigoArticulo}</td>
              <td>{new Date(detalle.FechaRegistro).toLocaleString()}</td>
              <td>{new Date(detalle.FechaPedido).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DetallesPedido;
