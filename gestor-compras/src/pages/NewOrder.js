import React, { useState } from 'react';

const NewOrder = () => {
  const [formData, setFormData] = useState({
    CodigoEmpresa: 1,
    EjercicioPedido: 2025,
    SeriePedido: "A",
    NumeroPedido: 1001,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      alert(result.message || 'Pedido enviado');
    } catch (err) {
      console.error(err);
      alert('Error al enviar pedido');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Nuevo Pedido</h2>
      <form onSubmit={handleSubmit}>
        <input name="CodigoCliente" placeholder="Código Cliente" onChange={handleChange} required />
        <input name="RazonSocial" placeholder="Razón Social" onChange={handleChange} />
        <input name="Nombre" placeholder="Nombre" onChange={handleChange} />
        <input name="Domicilio" placeholder="Domicilio" onChange={handleChange} />
        <input name="Municipio" placeholder="Municipio" onChange={handleChange} />
        <input name="Provincia" placeholder="Provincia" onChange={handleChange} />
        <input name="FormadePago" placeholder="Forma de Pago" onChange={handleChange} />
        {/* Puedes ir agregando más campos según necesites */}

        <button type="submit">Guardar Pedido</button>
      </form>
    </div>
  );
};

export default NewOrder;
