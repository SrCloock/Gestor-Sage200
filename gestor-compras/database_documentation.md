# Documentación de Base de Datos

## Tablas Principales

### `CLIENTES`
- Campos relevantes:
  - `CodigoCliente` (int): Identificador único
  - `UsuarioLogicNet` (varchar): Nombre de usuario
  - `ContraseñaLogicNet` (varchar): Contraseña en texto plano
  - `RazonSocial` (varchar): Nombre de la empresa
  - `Nombre` (varchar): Nombre del contacto
  - `CodigoEmpresa` (int): Empresa asociada

### `CabeceraPedidoCliente`
- Campos principales:
  - `CodigoEmpresa` (int)
  - `NumeroPedido` (int)
  - `CodigoCliente` (int)
  - `FechaPedido` (datetime)
  - `Estado` (varchar): 'Pendiente'|'Completado'|'Cancelado'

### `LineasPedidoCliente`
- Campos principales:
  - `CodigoEmpresa` (int)
  - `NumeroPedido` (int)
  - `Orden` (int)
  - `CodigoArticulo` (varchar)
  - `Cantidad` (int)
  - `Precio` (decimal)

### `ArticuloProveedor`
- Campos principales:
  - `CodigoArticulo` (varchar)
  - `NombreArticulo` (varchar)
  - `PrecioProveedor` (decimal)

## Consultas Clave

### Login
```sql
SELECT CodigoCliente, RazonSocial, Nombre, CodigoEmpresa 
FROM CLIENTES 
WHERE UsuarioLogicNet = @usuario 
AND ContraseñaLogicNet = @contraseña
AND CodigoCliente = @codigo