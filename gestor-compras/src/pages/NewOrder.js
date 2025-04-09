import React, { useState, useEffect } from 'react';

const NewOrder = () => {
  const [formData, setFormData] = useState({
    CodigoEmpresa: 0, // Inicializado como 0 hasta obtenerlo de la API
    EjercicioPedido: new Date().getFullYear(),
    SeriePedido: "A", // Se puede modificar si quieres diferentes series
    NumeroPedido: 0,  // Será autoincremental en la base de datos, pero lo inicializamos aquí.
    FechaPedido: new Date().toISOString(),
    FechaNecesaria: new Date().toISOString(),
    CodigoCliente: "",
    CifDni: "",
    CodigoCadena_: "",
    SiglaNacion: "",
    CifEuropeo: "",
    RazonSocial: "",
    RazonSocial2: "",
    Nombre: "",
    Domicilio: "",
    Domicilio2: "",
    CodigoPostal: "",
    CodigoMunicipio: "",
    Municipio: "",
    ColaMunicipio: "",
    CodigoProvincia: "",
    Provincia: "",
    CodigoNacion: null,
    Nacion: "",
    FormadePago: "",
    DomicilioEnvio: null,
    DomicilioFactura: null,
    DomicilioRecibo: null,
    CodigoCanal: "",
    CodigoProyecto: "",
    CodigoSeccion: "",
    CodigoContable: "",
    Estado: 1,
  });

  // Estado para el proveedor y los productos seleccionados
  const [proveedor, setProveedor] = useState({
    CodigoProveedor: "",
    RazonSocialProveedor: "",
  });

  const [productosSeleccionados, setProductosSeleccionados] = useState([]);

  // Función para obtener el código de empresa y la razón social
  const fetchClienteData = async (codigoCliente) => {
    try {
      const res = await fetch(`http://localhost:3001/api/clientes/${codigoCliente}`);
      const data = await res.json();
      if (data) {
        setFormData(prev => ({
          ...prev,
          CodigoEmpresa: data.CodigoEmpresa,  // Obtenemos el Código de Empresa
          RazonSocial: data.RazonSocial,  // Obtenemos la razón social
        }));
      }
    } catch (err) {
      console.error('Error al obtener datos del cliente:', err);
    }
  };

  // Función para obtener el número de pedido autoincremental
  const fetchNumeroPedido = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/orders/nextNumeroPedido?CodigoEmpresa=${formData.CodigoEmpresa}`);
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        NumeroPedido: data.numeroPedido || 1001,  // Primer número si no existe
      }));
    } catch (err) {
      console.error('Error al obtener el número de pedido:', err);
    }
  };

  // Cargar datos cuando se modifica el CódigoCliente
  useEffect(() => {
    if (formData.CodigoCliente) {
      fetchClienteData(formData.CodigoCliente);  // Obtenemos los datos del cliente
      fetchNumeroPedido();  // Obtenemos el próximo número de pedido
    }
  }, [formData.CodigoCliente]);

  // Función para manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Función para manejar la selección de productos
  const handleSeleccionarProducto = (producto) => {
    setProductosSeleccionados((prev) => {
      const productoExistente = prev.find(item => item.id === producto.id);
      if (productoExistente) {
        return prev.map(item =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  // Función para enviar el pedido
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const pedidoData = {
        ...formData,
        productos: productosSeleccionados,  // Añadimos los productos seleccionados al pedido
      };

      const res = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoData),
      });

      const result = await res.json();
      alert(result.message || 'Pedido enviado');
    } catch (err) {
      console.error(err);
      alert('Error al enviar pedido');
    }
  };

  // Simulación de productos disponibles (esto debería venir de una API)
  const productosDisponibles = [
    { id: 1, nombre: 'Producto 1', precio: 100 },
    { id: 2, nombre: 'Producto 2', precio: 200 },
    { id: 3, nombre: 'Producto 3', precio: 300 },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2>Nuevo Pedido</h2>
      <form onSubmit={handleSubmit}>
        <input 
          name="CodigoCliente" 
          placeholder="Código Cliente" 
          onChange={handleChange} 
          required 
        />
        <input 
          name="RazonSocial" 
          placeholder="Razón Social" 
          value={formData.RazonSocial} 
          onChange={handleChange} 
        />
        <input 
          name="Nombre" 
          placeholder="Nombre" 
          onChange={handleChange} 
        />
        <input 
          name="Domicilio" 
          placeholder="Domicilio" 
          onChange={handleChange} 
        />
        <input 
          name="Municipio" 
          placeholder="Municipio" 
          onChange={handleChange} 
        />
        <input 
          name="Provincia" 
          placeholder="Provincia" 
          onChange={handleChange} 
        />
        <input 
          name="FormadePago" 
          placeholder="Forma de Pago" 
          onChange={handleChange} 
        />

        {/* Sección para seleccionar productos */}
        <h3>Seleccionar productos</h3>
        <div>
          {productosDisponibles.map((producto) => (
            <div key={producto.id}>
              <span>{producto.nombre} - ${producto.precio}</span>
              <button 
                type="button" 
                onClick={() => handleSeleccionarProducto(producto)}
              >
                Añadir al pedido
              </button>
            </div>
          ))}
        </div>

        {/* Mostrar productos seleccionados */}
        <h4>Productos seleccionados:</h4>
        <ul>
          {productosSeleccionados.map((producto) => (
            <li key={producto.id}>
              {producto.nombre} (Cantidad: {producto.cantidad}) - ${producto.precio * producto.cantidad}
            </li>
          ))}
        </ul>

        <button type="submit">Guardar Pedido</button>
      </form>
    </div>
  );
};

export default NewOrder;
