import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  // Para redirigir después de iniciar sesión

const Home = () => {
  const welcomeMessage = "Bienvenido al gestor de compras";
  const [hasStarted, setHasStarted] = useState(false);
  const [user, setUser] = useState(null); // Estado para almacenar la información del usuario
  const navigate = useNavigate(); // Reemplazamos useHistory por useNavigate

  useEffect(() => {
    // Simulamos una verificación de sesión o un fetch de datos de usuario desde una API
    const loggedInUser = JSON.parse(localStorage.getItem('user'));  // Suponemos que la información de usuario está en localStorage
    if (loggedInUser) {
      setUser(loggedInUser);  // Seteamos los datos del usuario si están disponibles
      setHasStarted(true);  // Ya podemos mostrar el contenido después de loguearse
    }
  }, []);

  const handleStart = () => {
    // Redirige al usuario al panel principal o perfil después de hacer clic en comenzar
    navigate('/dashboard');  // Redirige a la ruta que deseas, por ejemplo, el panel de usuario
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{welcomeMessage}</h1>
      <p style={styles.subtitle}>Organiza y gestiona tus compras de manera eficiente.</p>

      {hasStarted && user ? (
        <>
          <p style={styles.message}>
            Estás logueado como {user.razonSocial} - {user.nombreUsuario} <br />
            Código de Empresa: {user.codigoEmpresa}
          </p>
          <button 
            style={styles.button} 
            onClick={handleStart} 
            aria-label="Comenzar el gestor de compras"
          >
            Comenzar
          </button>
        </>
      ) : (
        <button 
          style={styles.button} 
          onClick={handleStart} 
          aria-label="Comenzar el gestor de compras"
        >
          Comenzar
        </button>
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
