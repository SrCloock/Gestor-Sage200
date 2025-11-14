const { getPool } = require('../db/Sage200db');

// Función para generar albarán de compra (proveedor)
const generarAlbaranProveedor = async (transaction, orderInfo, itemsRecepcionados, codigoEmpresa, esParcial = false, numeroParcial = 1) => {
  try {
    // Agrupar items por proveedor
    const itemsPorProveedor = {};
    
    itemsRecepcionados.forEach(item => {
      const proveedor = item.CodigoProveedor || 'DEFAULT';
      if (!itemsPorProveedor[proveedor]) {
        itemsPorProveedor[proveedor] = [];
      }
      itemsPorProveedor[proveedor].push(item);
    });

    const albaranesGenerados = [];

    // Generar un albarán por cada proveedor
    for (const [codigoProveedor, itemsProveedor] of Object.entries(itemsPorProveedor)) {
      // Obtener información del proveedor
      const proveedorResult = await transaction.request()
        .input('CodigoProveedor', codigoProveedor)
        .query(`
          SELECT 
            RazonSocial, 
            Nombre,
            CifDni,
            CifEuropeo,
            Domicilio,
            CodigoPostal,
            CodigoMunicipio,
            Municipio,
            CodigoProvincia,
            Provincia,
            CodigoNacion,
            Nacion,
            CodigoCondiciones,
            FormadePago,
            CodigoContable,
            CodigoIdioma_,
            MantenerCambio_,
            CodigoContableANT_
          FROM Proveedores
          WHERE CodigoProveedor = @CodigoProveedor
        `);

      const proveedor = proveedorResult.recordset[0] || {
        RazonSocial: 'Proveedor No Especificado',
        Nombre: 'Proveedor No Especificado',
        CifDni: '',
        CifEuropeo: '',
        Domicilio: '',
        CodigoPostal: '',
        CodigoMunicipio: '',
        Municipio: '',
        CodigoProvincia: '',
        Provincia: '',
        CodigoNacion: '108',
        Nacion: 'ESPAÑA',
        CodigoCondiciones: 0,
        FormadePago: '',
        CodigoContable: '',
        CodigoIdioma_: 'ESP',
        MantenerCambio_: 0,
        CodigoContableANT_: ''
      };

      // Obtener el próximo número de albarán de compra
      const albaranResult = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioAlbaran', new Date().getFullYear())
        .input('SerieAlbaran', 'WebCP') // Serie para albaranes de compra
        .query(`
          SELECT ISNULL(MAX(NumeroAlbaran), 0) + 1 AS SiguienteNumero
          FROM CabeceraAlbaranProveedor
          WHERE CodigoEmpresa = @CodigoEmpresa
            AND EjercicioAlbaran = @EjercicioAlbaran
            AND SerieAlbaran = @SerieAlbaran
        `);

      const numeroAlbaran = albaranResult.recordset[0].SiguienteNumero;
      const fechaActual = new Date();

      // Calcular totales
      let baseImponibleTotal = 0;
      let totalIVATotal = 0;

      itemsProveedor.forEach(item => {
        const precioConIva = item.Precio || 0;
        const unidades = item.UnidadesRecibidas || 0;
        const porcentajeIva = item.PorcentajeIva || 21;

        // Cálculo de base imponible e IVA
        const baseImponible = (precioConIva * unidades) / (1 + (porcentajeIva / 100));
        const ivaLinea = baseImponible * (porcentajeIva / 100);

        baseImponibleTotal += baseImponible;
        totalIVATotal += ivaLinea;
      });

      const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;

      // Crear observaciones
      let observaciones = `Albarán generado automáticamente para el pedido ${orderInfo.NumeroPedido}`;
      if (esParcial) {
        observaciones += ` - Recepción parcial ${numeroParcial}`;
      }

      // Insertar cabecera del albarán de proveedor
      await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioAlbaran', new Date().getFullYear())
        .input('SerieAlbaran', 'WebCP')
        .input('NumeroAlbaran', numeroAlbaran)
        .input('CodigoProveedor', codigoProveedor)
        .input('RazonSocial', proveedor.RazonSocial)
        .input('Nombre', proveedor.Nombre || proveedor.RazonSocial)
        .input('CifDni', proveedor.CifDni)
        .input('CifEuropeo', proveedor.CifEuropeo || '')
        .input('Domicilio', proveedor.Domicilio || '')
        .input('CodigoPostal', proveedor.CodigoPostal || '')
        .input('Municipio', proveedor.Municipio || '')
        .input('Provincia', proveedor.Provincia || '')
        .input('CodigoNacion', proveedor.CodigoNacion || '108')
        .input('Nacion', proveedor.Nacion || 'ESPAÑA')
        .input('FechaAlbaran', fechaActual)
        .input('BaseImponible', baseImponibleTotal)
        .input('TotalIVA', totalIVATotal)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('NumeroLineas', itemsProveedor.length)
        .input('Observaciones', observaciones)
        .input('StatusFacturado', 0)
        .query(`
          INSERT INTO CabeceraAlbaranProveedor (
            CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran,
            CodigoProveedor, RazonSocial, Nombre, CifDni, CifEuropeo,
            Domicilio, CodigoPostal, Municipio, Provincia, CodigoNacion, Nacion,
            FechaAlbaran, BaseImponible, TotalIVA, ImporteLiquido,
            NumeroLineas, Observaciones, StatusFacturado
          ) VALUES (
            @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran,
            @CodigoProveedor, @RazonSocial, @Nombre, @CifDni, @CifEuropeo,
            @Domicilio, @CodigoPostal, @Municipio, @Provincia, @CodigoNacion, @Nacion,
            @FechaAlbaran, @BaseImponible, @TotalIVA, @ImporteLiquido,
            @NumeroLineas, @Observaciones, @StatusFacturado
          )
        `);

      // Insertar líneas del albarán de proveedor
      for (const [index, item] of itemsProveedor.entries()) {
        const precioConIva = item.Precio || 0;
        const unidades = item.UnidadesRecibidas || 0;
        const porcentajeIva = item.PorcentajeIva || 21;

        const baseImponible = (precioConIva * unidades) / (1 + (porcentajeIva / 100));
        const ivaLinea = baseImponible * (porcentajeIva / 100);
        const importeLiquido = baseImponible + ivaLinea;

        await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', new Date().getFullYear())
          .input('SerieAlbaran', 'WebCP')
          .input('NumeroAlbaran', numeroAlbaran)
          .input('Orden', index + 1)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', item.DescripcionArticulo)
          .input('Unidades', unidades)
          .input('Precio', precioConIva)
          .input('BaseImponible', baseImponible)
          .input('PorcentajeIva', porcentajeIva)
          .input('CuotaIva', ivaLinea)
          .input('ImporteLiquido', importeLiquido)
          .input('ComentarioRecepcion', item.ComentarioRecepcion || '')
          .query(`
            INSERT INTO LineasAlbaranProveedor (
              CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran, Orden,
              CodigoArticulo, DescripcionArticulo, Unidades, Precio,
              BaseImponible, [%Iva], CuotaIva, ImporteLiquido, ComentarioRecepcion
            ) VALUES (
              @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran, @Orden,
              @CodigoArticulo, @DescripcionArticulo, @Unidades, @Precio,
              @BaseImponible, @PorcentajeIva, @CuotaIva, @ImporteLiquido, @ComentarioRecepcion
            )
          `);
      }

      albaranesGenerados.push({
        proveedor: codigoProveedor,
        numeroAlbaran: numeroAlbaran,
        items: itemsProveedor.length,
        total: importeLiquidoTotal
      });

      console.log(`✅ Albarán de compra generado para proveedor ${codigoProveedor}: ${numeroAlbaran}`);
    }

    return albaranesGenerados;

  } catch (error) {
    console.error('❌ Error al generar albarán de proveedor:', error);
    throw error;
  }
};

// Función principal para procesar recepciones y generar albaranes
const procesarRecepcionYGenerarAlbaranes = async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Obtener información del pedido
      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT 
            CodigoEmpresa, 
            EjercicioPedido,
            CodigoCliente,
            RazonSocial,
            NumeroPedido,
            Estado,
            StatusAprobado
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = @SeriePedido
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const orderInfo = orderResult.recordset[0];

      // 2. Obtener recepciones anteriores para determinar si es parcial
      const recepcionesAnterioresResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .input('SeriePedido', 'WebCD')
        .query(`
          SELECT COUNT(DISTINCT FechaRecepcion) as TotalRecepciones
          FROM LineasPedidoCliente
          WHERE NumeroPedido = @NumeroPedido 
          AND SeriePedido = @SeriePedido
          AND FechaRecepcion IS NOT NULL
        `);

      const totalRecepcionesAnteriores = recepcionesAnterioresResult.recordset[0].TotalRecepciones || 0;
      const esRecepcionParcial = totalRecepcionesAnteriores > 0;
      const numeroParcial = totalRecepcionesAnteriores + 1;

      // 3. Filtrar solo los items que tienen unidades recibidas en esta recepción
      const itemsRecepcionados = items.filter(item => 
        item.UnidadesRecibidas > 0 && item.UnidadesRecibidas !== null
      );

      if (itemsRecepcionados.length === 0) {
        throw new Error('No hay unidades recepcionadas para generar albarán');
      }

      // 4. Generar albaranes de compra
      const albaranesGenerados = await generarAlbaranProveedor(
        transaction, 
        orderInfo, 
        itemsRecepcionados, 
        orderInfo.CodigoEmpresa,
        esRecepcionParcial,
        numeroParcial
      );

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: `Recepción procesada y ${albaranesGenerados.length} albarán(es) de compra generado(s) correctamente`,
        albaranesGenerados: albaranesGenerados,
        esParcial: esRecepcionParcial,
        numeroParcial: numeroParcial
      });

    } catch (err) {
      await transaction.rollback();
      console.error('❌ Error en la transacción:', err);
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Error al procesar la recepción y generar albaranes'
      });
    }
  } catch (error) {
    console.error('❌ Error al procesar recepción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al procesar la recepción'
    });
  }
};

// Función para obtener historial de albaranes de compra por pedido
const getAlbaranesCompraPorPedido = async (req, res) => {
  try {
    const { orderId } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('NumeroPedido', orderId)
      .query(`
        SELECT 
          cap.NumeroAlbaran,
          cap.SerieAlbaran,
          cap.FechaAlbaran,
          cap.CodigoProveedor,
          cap.RazonSocial as NombreProveedor,
          cap.BaseImponible,
          cap.TotalIVA,
          cap.ImporteLiquido,
          cap.NumeroLineas,
          cap.Observaciones,
          COUNT(lap.Orden) as TotalItems
        FROM CabeceraAlbaranProveedor cap
        LEFT JOIN LineasAlbaranProveedor lap ON cap.NumeroAlbaran = lap.NumeroAlbaran 
          AND cap.SerieAlbaran = lap.SerieAlbaran
        WHERE cap.Observaciones LIKE '%pedido ${orderId}%'
        GROUP BY 
          cap.NumeroAlbaran, cap.SerieAlbaran, cap.FechaAlbaran,
          cap.CodigoProveedor, cap.RazonSocial, cap.BaseImponible,
          cap.TotalIVA, cap.ImporteLiquido, cap.NumeroLineas, cap.Observaciones
        ORDER BY cap.FechaAlbaran DESC
      `);

    res.status(200).json({
      success: true,
      albaranes: result.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener albaranes de compra:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el historial de albaranes de compra'
    });
  }
};

module.exports = {
  procesarRecepcionYGenerarAlbaranes,
  getAlbaranesCompraPorPedido,
  generarAlbaranProveedor
};