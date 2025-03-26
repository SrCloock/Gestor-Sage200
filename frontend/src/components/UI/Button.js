import React from 'react';
import './Button.css';

const Button = ({ children, primary, danger, ...props }) => {
  const className = `button ${primary ? 'primary' : ''} ${danger ? 'danger' : ''}`;
  
  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
};

export default Button;