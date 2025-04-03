import React, { useState } from 'react';

// Componente Home mejorado con más detalles y estructura
const Home = () => {
  const welcomeMessage = "Bienvenido al gestor de compras";
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = () => {
    setHasStarted(true);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{welcomeMessage}</h1>
      <p style={styles.subtitle}>Organiza y gestiona tus compras de manera eficiente.</p>
      {!hasStarted ? (
        <button 
          style={styles.button} 
          onClick={handleStart} 
          aria-label="Comenzar el gestor de compras"
        >
          Comenzar
        </button>
      ) : (
        <p style={styles.message}>¡Estás listo para empezar a gestionar tus compras!</p>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f4f4f9',
    fontFamily: 'Arial, sans-serif',
    padding: '0 20px',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '2.5rem',
    color: '#333',
    marginBottom: '20px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#555',
    marginBottom: '30px',
    textAlign: 'center',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.3s ease, transform 0.3s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  buttonHover: {
    backgroundColor: '#45a049',
    transform: 'scale(1.05)',
  },
  message: {
    fontSize: '1.2rem',
    color: '#333',
    marginTop: '20px',
    textAlign: 'center',
  },
  // Media queries para mejorar la visualización en dispositivos móviles
  '@media (max-width: 768px)': {
    title: {
      fontSize: '2rem',
    },
    subtitle: {
      fontSize: '1rem',
    },
    button: {
      fontSize: '0.9rem',
      padding: '8px 16px',
    },
  },
};

export default Home;
