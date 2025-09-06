const { getPool } = require('../db/Sage200db');

const getPendingOrders = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        NumeroPedido,
        FechaPedido,
        RazonSocial,
        CifDni,
        NumeroLineas,
        StatusAprobado,
        SeriePedido,
        BaseImponible,
        FechaNecesaria,
        ObservacionesPedido,
        CodigoCliente
      FROM CabeceraPedidoCliente
      WHERE SeriePedido = 'Web' AND StatusAprobado = 0
      ORDER BY FechaPedido DESC
    `);

    console.log('Pedidos pendientes encontrados:', result.recordset.length);

    res.status(200).json({
      success: true,
      orders: result.recordset
    });
  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener pedidos pendientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getOrderForReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const pool = await getPool();

    const orderResult = await pool.request()
      .input('NumeroPedido', orderId)
      .query(`
        SELECT 
          c.NumeroPedido,
          c.FechaPedido,
          c.RazonSocial,
          c.CifDni,
          c.Domicilio,
          c.CodigoPostal,
          c.Municipio,
          c.Provincia,
          c.StatusAprobado,
          c.ObservacionesPedido,
          c.FechaNecesaria,
          c.CodigoEmpresa,
          c.EjercicioPedido
        FROM CabeceraPedidoCliente c
        WHERE c.NumeroPedido = @NumeroPedido
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    const linesResult = await pool.request()
      .input('NumeroPedido', orderId)
      .query(`
        SELECT 
          l.Orden,
          l.CodigoArticulo,
          l.DescripcionArticulo,
          l.UnidadesPedidas,
          l.Precio,
          l.CodigoProveedor,
          l.CodigoIva,
          t.[%Iva] as PorcentajeIva,
          p.RazonSocial as NombreProveedor
        FROM LineasPedidoCliente l
        LEFT JOIN Proveedores p ON l.CodigoProveedor = p.CodigoProveedor
        LEFT JOIN tiposiva t ON l.CodigoIva = t.CodigoIva AND t.CodigoTerritorio = 0
        WHERE l.NumeroPedido = @NumeroPedido
        ORDER BY l.Orden
      `);

    // Eliminar posibles duplicados
    const uniqueProducts = [];
    const seenKeys = new Set();
    
    linesResult.recordset.forEach(item => {
      const key = `${item.Orden}-${item.CodigoArticulo}-${item.CodigoProveedor || 'no-prov'}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueProducts.push(item);
      }
    });

    res.status(200).json({
      success: true,
      order: {
        ...orderResult.recordset[0],
        Productos: uniqueProducts
      }
    });
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateOrderQuantitiesAndApprove = async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // 1. Obtener información completa del pedido
      const orderResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .query(`
          SELECT 
            CodigoEmpresa, 
            EjercicioPedido, 
            CodigoCliente,
            CifDni,
            RazonSocial,
            Domicilio,
            CodigoPostal,
            Municipio,
            Provincia,
            IdDelegacion,
            CodigoContable
          FROM CabeceraPedidoCliente
          WHERE NumeroPedido = @NumeroPedido AND SeriePedido = 'Web'
        `);

      if (orderResult.recordset.length === 0) {
        throw new Error('Pedido no encontrado');
      }

      const orderHeader = orderResult.recordset[0];
      const { CodigoEmpresa, EjercicioPedido, CodigoCliente, CifDni, RazonSocial, Domicilio, CodigoPostal, Municipio, Provincia, IdDelegacion, CodigoContable } = orderHeader;

      // 2. Actualizar cantidades en LineasPedidoCliente
      for (const item of items) {
        await transaction.request()
          .input('NumeroPedido', orderId)
          .input('Orden', item.Orden)
          .input('UnidadesPedidas', item.UnidadesPedidas)
          .input('UnidadesPendientes', item.UnidadesPedidas)
          .input('Unidades2_', item.UnidadesPedidas)
          .input('UnidadesPendientesFabricar', item.UnidadesPedidas)
          .query(`
            UPDATE LineasPedidoCliente 
            SET 
              UnidadesPedidas = @UnidadesPedidas,
              UnidadesPendientes = @UnidadesPendientes,
              Unidades2_ = @Unidades2_,
              UnidadesPendientesFabricar = @UnidadesPendientesFabricar
            WHERE NumeroPedido = @NumeroPedido AND Orden = @Orden
          `);
      }

      // 3. Recalcular totales del pedido
      const totalesResult = await transaction.request()
        .input('NumeroPedido', orderId)
        .query(`
          SELECT 
            SUM(UnidadesPedidas * Precio) AS BaseImponible,
            SUM((UnidadesPedidas * Precio) * (t.[%Iva] / 100.0)) AS TotalIVA
          FROM LineasPedidoCliente l
          LEFT JOIN tiposiva t ON l.CodigoIva = t.CodigoIva AND t.CodigoTerritorio = 0
          WHERE l.NumeroPedido = @NumeroPedido
        `);

      const baseImponibleTotal = parseFloat(totalesResult.recordset[0].BaseImponible) || 0;
      const totalIVATotal = parseFloat(totalesResult.recordset[0].TotalIVA) || 0;
      const importeLiquidoTotal = baseImponibleTotal + totalIVATotal;

      // 4. Actualizar cabecera con nuevos totales y estado
      await transaction.request()
        .input('NumeroPedido', orderId)
        .input('BaseImponible', baseImponibleTotal)
        .input('TotalIVA', totalIVATotal)
        .input('ImporteLiquido', importeLiquidoTotal)
        .input('StatusAprobado', -1)
        .query(`
          UPDATE CabeceraPedidoCliente 
          SET 
            BaseImponible = @BaseImponible,
            TotalIva = @TotalIVA,
            ImporteLiquido = @ImporteLiquido,
            StatusAprobado = @StatusAprobado
          WHERE NumeroPedido = @NumeroPedido
        `);

      // 5. Crear pedidos a proveedores (agrupados por proveedor)
      const pedidosPorProveedor = {};
      
      // Agrupar items por proveedor
      for (const item of items) {
        const proveedor = item.CodigoProveedor || 'DEFAULT';
        if (!pedidosPorProveedor[proveedor]) {
          pedidosPorProveedor[proveedor] = [];
        }
        pedidosPorProveedor[proveedor].push(item);
      }

      // Obtener el próximo número de pedido para proveedores
      let numeroPedidoProveedor = 1;
      
      const contadorResult = await transaction.request()
        .input('sysGrupo', CodigoEmpresa)
        .input('sysNombreContador', 'PEDIDOS_PRO')
        .input('sysNumeroSerie', 'Web')
        .query(`
          SELECT sysContadorValor 
          FROM LSYSCONTADORES
          WHERE sysGrupo = @sysGrupo
          AND sysNombreContador = @sysNombreContador
          AND (sysNumeroSerie = @sysNumeroSerie OR sysNumeroSerie IS NULL)
        `);

      if (contadorResult.recordset.length > 0) {
        numeroPedidoProveedor = contadorResult.recordset[0].sysContadorValor + 1;
      } else {
        const maxResult = await transaction.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', 'Web')
          .query(`
            SELECT MAX(NumeroPedido) as MaxNumero
            FROM CabeceraPedidoProveedor
            WHERE CodigoEmpresa = @CodigoEmpresa
            AND EjercicioPedido = @EjercicioPedido
            AND SeriePedido = @SeriePedido
          `);

        numeroPedidoProveedor = (maxResult.recordset[0].MaxNumero || 0) + 1;
        
        await transaction.request()
          .input('sysGrupo', CodigoEmpresa)
          .input('sysNombreContador', 'PEDIDOS_PRO')
          .input('sysNumeroSerie', 'Web')
          .input('sysContadorValor', numeroPedidoProveedor)
          .query(`
            INSERT INTO LSYSCONTADORES (sysGrupo, sysNombreContador, sysNumeroSerie, sysContadorValor)
            VALUES (@sysGrupo, @sysNombreContador, @sysNumeroSerie, @sysContadorValor)
          `);
      }

      // Crear un pedido por cada proveedor
      for (const [codigoProveedor, itemsProveedor] of Object.entries(pedidosPorProveedor)) {
        // Obtener información básica del proveedor (solo columnas existentes)
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
          CodigoContable: CodigoContable || '',
          CodigoIdioma_: 'ESP',
          MantenerCambio_: 0,
          CodigoContableANT_: CodigoContable || ''
        };

        // Verificar si ya existe un pedido con este número
        const existePedido = await transaction.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', 'Web')
          .input('NumeroPedido', numeroPedidoProveedor)
          .query(`
            SELECT COUNT(*) as Existe
            FROM CabeceraPedidoProveedor
            WHERE CodigoEmpresa = @CodigoEmpresa
            AND EjercicioPedido = @EjercicioPedido
            AND SeriePedido = @SeriePedido
            AND NumeroPedido = @NumeroPedido
          `);

        if (existePedido.recordset[0].Existe > 0) {
          let nuevoNumero = numeroPedidoProveedor + 1;
          let existeNuevo = await transaction.request()
            .input('CodigoEmpresa', CodigoEmpresa)
            .input('EjercicioPedido', EjercicioPedido)
            .input('SeriePedido', 'Web')
            .input('NumeroPedido', nuevoNumero)
            .query(`
              SELECT COUNT(*) as Existe
              FROM CabeceraPedidoProveedor
              WHERE CodigoEmpresa = @CodigoEmpresa
              AND EjercicioPedido = @EjercicioPedido
              AND SeriePedido = @SeriePedido
              AND NumeroPedido = @NumeroPedido
            `);

          while (existeNuevo.recordset[0].Existe > 0) {
            nuevoNumero++;
            existeNuevo = await transaction.request()
              .input('CodigoEmpresa', CodigoEmpresa)
              .input('EjercicioPedido', EjercicioPedido)
              .input('SeriePedido', 'Web')
              .input('NumeroPedido', nuevoNumero)
              .query(`
                SELECT COUNT(*) as Existe
                FROM CabeceraPedidoProveedor
                WHERE CodigoEmpresa = @CodigoEmpresa
                AND EjercicioPedido = @EjercicioPedido
                AND SeriePedido = @SeriePedido
                AND NumeroPedido = @NumeroPedido
              `);
          }
          
          numeroPedidoProveedor = nuevoNumero;
        }

        // Agregar observación con el formato #Pedido-RazonSocial en ObservacionesPedido
        const observacionesPedido = `#Pedido-${RazonSocial}`;

        // Insertar cabecera del pedido a proveedor con campos básicos
        await transaction.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', 'Web')
          .input('NumeroPedido', numeroPedidoProveedor)
          .input('IdDelegacion', IdDelegacion || '')
          .input('CodigoProveedor', codigoProveedor)
          .input('SiglaNacion', 'ES')
          .input('CifDni', proveedor.CifDni)
          .input('CifEuropeo', proveedor.CifEuropeo || '')
          .input('RazonSocial', proveedor.RazonSocial)
          .input('Nombre', proveedor.Nombre || proveedor.RazonSocial)
          .input('Domicilio', proveedor.Domicilio || '')
          .input('CodigoPostal', proveedor.CodigoPostal || '')
          .input('CodigoMunicipio', proveedor.CodigoMunicipio || '')
          .input('Municipio', proveedor.Municipio || '')
          .input('CodigoProvincia', proveedor.CodigoProvincia || '')
          .input('Provincia', proveedor.Provincia || '')
          .input('CodigoNacion', proveedor.CodigoNacion || '108')
          .input('Nacion', proveedor.Nacion || 'ESPAÑA')
          .input('CodigoCondiciones', proveedor.CodigoCondiciones || 0)
          .input('FormadePago', proveedor.FormadePago || '')
          .input('CodigoContable', proveedor.CodigoContable || '')
          .input('ObservacionesPedido', observacionesPedido) // CORRECCIÓN: Usamos ObservacionesPedido
          .input('FechaPedido', new Date().toISOString().split('T')[0] + ' 00:00:00.000')
          .input('FechaNecesaria', new Date().toISOString().split('T')[0] + ' 00:00:00.000')
          .input('FechaRecepcion', new Date().toISOString().split('T')[0] + ' 00:00:00.000')
          .input('FechaTope', new Date().toISOString().split('T')[0] + ' 00:00:00.000')
          .input('StatusAprobado', -1)
          .input('BaseImponible', 0)
          .input('TotalIVA', 0)
          .input('ImporteLiquido', 0)
          .input('NumeroLineas', itemsProveedor.length)
          .input('CodigoIdioma_', proveedor.CodigoIdioma_ || 'ESP')
          .input('MantenerCambio_', proveedor.MantenerCambio_ || 0)
          .input('CodigoContableANT_', proveedor.CodigoContableANT_ || '')
          .query(`
            INSERT INTO CabeceraPedidoProveedor (
              CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, IdDelegacion,
              CodigoProveedor, SiglaNacion, CifDni, CifEuropeo, RazonSocial, Nombre,
              Domicilio, CodigoPostal, CodigoMunicipio, Municipio, CodigoProvincia, Provincia,
              CodigoNacion, Nacion, CodigoCondiciones, FormadePago,
              CodigoContable, ObservacionesPedido, FechaPedido, FechaNecesaria, FechaRecepcion, FechaTope, // CORRECCIÓN: Usamos ObservacionesPedido
              StatusAprobado, BaseImponible, TotalIva, ImporteLiquido, NumeroLineas,
              CodigoIdioma_, MantenerCambio_, CodigoContableANT_
            )
            VALUES (
              @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @IdDelegacion,
              @CodigoProveedor, @SiglaNacion, @CifDni, @CifEuropeo, @RazonSocial, @Nombre,
              @Domicilio, @CodigoPostal, @CodigoMunicipio, @Municipio, @CodigoProvincia, @Provincia,
              @CodigoNacion, @Nacion, @CodigoCondiciones, @FormadePago,
              @CodigoContable, @ObservacionesPedido, @FechaPedido, @FechaNecesaria, @FechaRecepcion, @FechaTope, // CORRECCIÓN: Usamos @ObservacionesPedido
              @StatusAprobado, @BaseImponible, @TotalIva, @ImporteLiquido, @NumeroLineas,
              @CodigoIdioma_, @MantenerCambio_, @CodigoContableANT_
            )
          `);

        // Insertar líneas del pedido a proveedor
        let baseImponibleProveedor = 0;
        let totalIVAProveedor = 0;

        for (const [index, item] of itemsProveedor.entries()) {
          const importeLinea = item.UnidadesPedidas * (item.Precio || 0);
          const ivaLinea = importeLinea * (item.PorcentajeIva || 21) / 100;
          
          baseImponibleProveedor += importeLinea;
          totalIVAProveedor += ivaLinea;

          await transaction.request()
            .input('CodigoEmpresa', CodigoEmpresa)
            .input('EjercicioPedido', EjercicioPedido)
            .input('SeriePedido', 'Web')
            .input('NumeroPedido', numeroPedidoProveedor)
            .input('Orden', index + 1)
            .input('CodigoArticulo', item.CodigoArticulo)
            .input('DescripcionArticulo', item.DescripcionArticulo)
            .input('UnidadesPedidas', item.UnidadesPedidas)
            .input('Precio', item.Precio || 0)
            .input('CodigoIva', item.CodigoIva || 21)
            .input('PorcentajeIva', item.PorcentajeIva || 21)
            .input('ImporteBruto', importeLinea)
            .input('BaseImponible', importeLinea)
            .input('CuotaIva', ivaLinea)
            .input('ImporteLiquido', importeLinea + ivaLinea)
            .query(`
              INSERT INTO LineasPedidoProveedor (
                CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden,
                CodigoArticulo, DescripcionArticulo,
                UnidadesPedidas, Precio,
                CodigoIva, [%Iva],
                ImporteBruto, BaseImponible, CuotaIva, ImporteLiquido
              )
              VALUES (
                @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @Orden,
                @CodigoArticulo, @DescripcionArticulo,
                @UnidadesPedidas, @Precio,
                @CodigoIva, @PorcentajeIva,
                @ImporteBruto, @BaseImponible, @CuotaIva, @ImporteLiquido
              )
            `);
        }

        // Actualizar totales del pedido a proveedor
        await transaction.request()
          .input('CodigoEmpresa', CodigoEmpresa)
          .input('EjercicioPedido', EjercicioPedido)
          .input('SeriePedido', 'Web')
          .input('NumeroPedido', numeroPedidoProveedor)
          .input('BaseImponible', baseImponibleProveedor)
          .input('TotalIVA', totalIVAProveedor)
          .input('ImporteLiquido', baseImponibleProveedor + totalIVAProveedor)
          .query(`
            UPDATE CabeceraPedidoProveedor 
            SET 
              BaseImponible = @BaseImponible,
              TotalIva = @TotalIVA,
              ImporteLiquido = @ImporteLiquido
            WHERE 
              CodigoEmpresa = @CodigoEmpresa AND
              EjercicioPedido = @EjercicioPedido AND
              SeriePedido = @SeriePedido AND
              NumeroPedido = @NumeroPedido
          `);

        numeroPedidoProveedor++;
      }

      // Actualizar el contador de pedidos a proveedor
      await transaction.request()
        .input('sysGrupo', CodigoEmpresa)
        .input('sysNombreContador', 'PEDIDOS_PRO')
        .input('sysNumeroSerie', 'Web')
        .input('sysContadorValor', numeroPedidoProveedor - 1)
        .query(`
          UPDATE LSYSCONTADORES 
          SET sysContadorValor = @sysContadorValor
          WHERE sysGrupo = @sysGrupo
          AND sysNombreContador = @sysNombreContador
          AND (sysNumeroSerie = @sysNumeroSerie OR sysNumeroSerie IS NULL)
        `);

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: 'Pedido actualizado, aprobado y convertido a pedidos de proveedor correctamente'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en la transacción:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la actualización del pedido'
    });
  }
};

module.exports = {
  getPendingOrders,
  getOrderForReview,
  updateOrderQuantitiesAndApprove
};