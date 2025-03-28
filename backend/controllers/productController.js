exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        a.Codigo AS CodigoArticulo,
        a.Descripcion AS NombreArticulo,
        a.PrecioVenta AS Precio,
        p.Codigo AS CodigoProveedor,
        p.Nombre AS NombreProveedor,
        a.DescripcionLarga AS Descripcion
      FROM Articulos a
      LEFT JOIN ArticuloProveedor ap ON a.Codigo = ap.CodigoArticulo
      LEFT JOIN Proveedores p ON ap.CodigoProveedor = p.Codigo
      WHERE a.Codigo = @codigo
    `;

    const result = await sage200Pool.request()
      .input('codigo', id)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error en getProductById:', err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
};