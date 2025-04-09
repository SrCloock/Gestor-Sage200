import React, { useState } from 'react';
import { createOrder } from '../services/api';

const NewOrder = () => {
  const [orderData, setOrderData] = useState({
    codigoProveedor: '',
    productos: [],
    total: 0,
  });

  const handleInputChange = (e) => {
    setOrderData({ ...orderData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createOrder(orderData);
      alert('Pedido creado con éxito');
    } catch (error) {
      alert('Error al crear el pedido');
    }
  };

  return (
    <div>
      <h2>Nuevo Pedido</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Código Proveedor:</label>
          <input
            type="text"
            name="codigoProveedor"
            value={orderData.codigoProveedor}
            onChange={handleInputChange}
          />
        </div>
        {/* Aquí puedes agregar más campos como productos, cantidades, etc. */}
        <button type="submit">Crear Pedido</button>
      </form>
    </div>
  );
};

export default NewOrder;
