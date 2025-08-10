import React from 'react';
import { FaShoppingCart, FaTrash, FaArrowRight } from 'react-icons/fa';

const CartPreview = ({ products, onRemove, onGoToOrder }) => {
  if (products.length === 0) return null;

  return (
    <div className="cart-preview">
      <div className="cart-header">
        <h3><FaShoppingCart /> Tu Pedido</h3>
        <span className="cart-count">{products.reduce((acc, p) => acc + p.Cantidad, 0)} productos</span>
      </div>
      
      <div className="cart-items">
        {products.map(product => (
          <div key={`${product.CodigoArticulo}-${product.CodigoProveedor}`} className="cart-item">
            <div className="item-info">
              <span className="item-name">{product.DescripcionArticulo}</span>
              <span className="item-code">{product.CodigoArticulo}</span>
            </div>
            
            <div className="item-actions">
              <span className="item-quantity">{product.Cantidad}</span>
              <button 
                className="remove-button"
                onClick={() => onRemove(`${product.CodigoArticulo}-${product.CodigoProveedor}`)}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <button className="go-to-order-button" onClick={onGoToOrder}>
        Continuar al pedido <FaArrowRight />
      </button>
    </div>
  );
};

export default CartPreview;