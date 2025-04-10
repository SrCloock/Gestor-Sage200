import React from 'react';

const OrderItem = ({ item }) => (
  <div className="order-item">
    <h4>{item.NombreProducto}</h4>
    <p>{item.DescripcionProducto}</p>
    <p>Cantidad: {item.Cantidad}</p>
    <p>Precio: {item.Precio.toFixed(2)} €</p>
  </div>
);

export default OrderItem;
