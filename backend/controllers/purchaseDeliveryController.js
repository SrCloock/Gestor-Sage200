const { getPool } = require('../db/Sage200db');

// Función mejorada para generar/actualizar albarán de compra (proveedor)
const generarAlbaranProveedor = async (transaction, orderInfo, itemsRecepcionados, codigoEmpresa, esParcial = false, numeroParcial = 1) => {
  try {
    console.log(`🔄 Generando/Actualizando albarán de compra para pedido ${orderInfo.NumeroPedido}, parcial: ${esParcial}, número: ${numeroParcial}`);
    
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
    const fechaActual = new Date();

    // Generar un albarán por cada proveedor
    for (const [codigoProveedor, itemsProveedor] of Object.entries(itemsPorProveedor)) {
      console.log(`📦 Procesando proveedor: ${codigoProveedor} con ${itemsProveedor.length} items`);

      // 🔥 BUSCAR ALBARÁN EXISTENTE NO FACTURADO para este pedido y proveedor
      const albaranExistenteResult = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', orderInfo.EjercicioPedido)
        .input('SeriePedido', orderInfo.SeriePedido)
        .input('NumeroPedido', orderInfo.NumeroPedido)
        .input('CodigoProveedor', codigoProveedor)
        .input('StatusFacturado', 0) // Solo albaranes NO facturados
        .query(`
          SELECT 
            cap.NumeroAlbaran,
            cap.SerieAlbaran,
            cap.EjercicioAlbaran,
            cap.BaseImponible,
            cap.TotalIVA,
            cap.ImporteLiquido,
            cap.NumeroLineas
          FROM CabeceraAlbaranProveedor cap
          WHERE cap.CodigoEmpresa = @CodigoEmpresa
            AND cap.EjercicioPedido = @EjercicioPedido
            AND cap.SeriePedido = @SeriePedido  
            AND cap.NumeroPedido = @NumeroPedido
            AND cap.CodigoProveedor = @CodigoProveedor
            AND cap.StatusFacturado = @StatusFacturado
        `);

      let numeroAlbaran;
      let esAlbaranNuevo = false;
      let albaranExistente = null;

      if (albaranExistenteResult.recordset.length > 0) {
        // 🔥 USAR ALBARÁN EXISTENTE (NO FACTURADO)
        albaranExistente = albaranExistenteResult.recordset[0];
        numeroAlbaran = albaranExistente.NumeroAlbaran;
        console.log(`📄 Actualizando albarán existente: ${numeroAlbaran} para proveedor ${codigoProveedor}`);
        
        // ELIMINAR LÍNEAS EXISTENTES para reinsertar con nuevas cantidades
        await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .input('SerieAlbaran', 'WebCP')
          .query(`
            DELETE FROM LineasAlbaranProveedor
            WHERE NumeroAlbaran = @NumeroAlbaran AND SerieAlbaran = @SerieAlbaran
          `);
      } else {
        // 🔥 CREAR NUEVO ALBARÁN (no existe o está facturado)
        const albaranResult = await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', fechaActual.getFullYear())
          .input('SerieAlbaran', 'WebCP')
          .query(`
            SELECT ISNULL(MAX(NumeroAlbaran), 0) + 1 AS SiguienteNumero
            FROM CabeceraAlbaranProveedor
            WHERE CodigoEmpresa = @CodigoEmpresa
              AND EjercicioAlbaran = @EjercicioAlbaran
              AND SerieAlbaran = @SerieAlbaran
          `);

        numeroAlbaran = albaranResult.recordset[0].SiguienteNumero;
        esAlbaranNuevo = true;
        console.log(`🆕 Creando nuevo albarán: ${numeroAlbaran} para proveedor ${codigoProveedor}`);
      }

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

      // Calcular totales
      let baseImponibleTotal = 0;
      let totalIVATotal = 0;

      itemsProveedor.forEach(item => {
        const precio = item.Precio || 0;
        const unidades = item.UnidadesRecibidas || 0;
        const porcentajeIva = item.PorcentajeIva || 21;

        // Cálculo de base imponible e IVA
        const baseImponible = (precio * unidades) / (1 + (porcentajeIva / 100));
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
      if (!esAlbaranNuevo) {
        observaciones += ` - Actualizado el ${fechaActual.toLocaleDateString()}`;
      }

      if (esAlbaranNuevo) {
        // 🔥 INSERTAR NUEVA CABECERA
        console.log(`💾 Insertando nueva cabecera del albarán de compra: ${numeroAlbaran}`);
        
        await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', fechaActual.getFullYear())
          .input('SerieAlbaran', 'WebCP')
          .input('NumeroAlbaran', numeroAlbaran)
          // 🔥 NUEVO: Vincular con pedido
          .input('EjercicioPedido', orderInfo.EjercicioPedido)
          .input('SeriePedido', orderInfo.SeriePedido)
          .input('NumeroPedido', orderInfo.NumeroPedido)
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
              EjercicioPedido, SeriePedido, NumeroPedido,  -- 🔥 NUEVOS CAMPOS
              CodigoProveedor, RazonSocial, Nombre, CifDni, CifEuropeo,
              Domicilio, CodigoPostal, Municipio, Provincia, CodigoNacion, Nacion,
              FechaAlbaran, BaseImponible, TotalIVA, ImporteLiquido,
              NumeroLineas, Observaciones, StatusFacturado
            ) VALUES (
              @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran,
              @EjercicioPedido, @SeriePedido, @NumeroPedido,  -- 🔥 NUEVOS CAMPOS
              @CodigoProveedor, @RazonSocial, @Nombre, @CifDni, @CifEuropeo,
              @Domicilio, @CodigoPostal, @Municipio, @Provincia, @CodigoNacion, @Nacion,
              @FechaAlbaran, @BaseImponible, @TotalIVA, @ImporteLiquido,
              @NumeroLineas, @Observaciones, @StatusFacturado
            )
          `);
      } else {
        // 🔥 ACTUALIZAR CABECERA EXISTENTE
        console.log(`✏️ Actualizando cabecera existente del albarán: ${numeroAlbaran}`);
        
        await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .input('SerieAlbaran', 'WebCP')
          .input('BaseImponible', baseImponibleTotal)
          .input('TotalIVA', totalIVATotal)
          .input('ImporteLiquido', importeLiquidoTotal)
          .input('NumeroLineas', itemsProveedor.length)
          .input('Observaciones', observaciones)
          .input('FechaAlbaran', fechaActual)
          .query(`
            UPDATE CabeceraAlbaranProveedor 
            SET 
              BaseImponible = @BaseImponible,
              TotalIVA = @TotalIVA,
              ImporteLiquido = @ImporteLiquido,
              NumeroLineas = @NumeroLineas,
              Observaciones = @Observaciones,
              FechaAlbaran = @FechaAlbaran
            WHERE NumeroAlbaran = @NumeroAlbaran AND SerieAlbaran = @SerieAlbaran
          `);
      }

      // 🔥 INSERTAR LÍNEAS DEL ALBARÁN (completas según especificación)
      for (const [index, item] of itemsProveedor.entries()) {
        const precio = item.Precio || 0;
        const unidades = item.UnidadesRecibidas || 0;
        const porcentajeIva = item.PorcentajeIva || 21;

        // Cálculos completos
        const baseImponible = (precio * unidades) / (1 + (porcentajeIva / 100));
        const ivaLinea = baseImponible * (porcentajeIva / 100);
        const importeLiquido = baseImponible + ivaLinea;
        const importeBruto = precio * unidades;

        await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', fechaActual.getFullYear())
          .input('SerieAlbaran', 'WebCP')
          .input('NumeroAlbaran', numeroAlbaran)
          .input('Orden', index + 1)
          // 🔥 NUEVO: Vincular con pedido
          .input('EjercicioPedido', orderInfo.EjercicioPedido)
          .input('SeriePedido', orderInfo.SeriePedido)
          .input('NumeroPedido', orderInfo.NumeroPedido)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', item.DescripcionArticulo)
          // 🔥 COMPLETAR TODAS LAS COLUMNAS REQUERIDAS
          .input('Unidades', unidades)
          .input('UnidadesRecibidas', unidades)
          .input('Unidades2_', unidades)
          .input('Precio', precio)
          .input('ImporteBruto', importeBruto)
          .input('ImporteNeto', importeBruto)  // Igual a ImporteBruto
          .input('BaseImponible', baseImponible)
          .input('BaseIva', baseImponible)     // Igual a BaseImponible
          .input('PorcentajeIva', porcentajeIva)
          .input('CuotaIva', ivaLinea)
          .input('TotalIva', ivaLinea)         // Igual a CuotaIva
          .input('ImporteLiquido', importeLiquido)
          .input('ComentarioRecepcion', item.ComentarioRecepcion || '')
          .query(`
            INSERT INTO LineasAlbaranProveedor (
              CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran, Orden,
              EjercicioPedido, SeriePedido, NumeroPedido,  -- 🔥 NUEVOS CAMPOS
              CodigoArticulo, DescripcionArticulo,
              Unidades, UnidadesRecibidas, Unidades2_, Precio,
              ImporteBruto, ImporteNeto, 
              BaseImponible, BaseIva,
              [%Iva], CuotaIva, TotalIva, ImporteLiquido,
              ComentarioRecepcion
            ) VALUES (
              @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran, @Orden,
              @EjercicioPedido, @SeriePedido, @NumeroPedido,  -- 🔥 NUEVOS CAMPOS
              @CodigoArticulo, @DescripcionArticulo,
              @Unidades, @UnidadesRecibidas, @Unidades2_, @Precio,
              @ImporteBruto, @ImporteNeto,
              @BaseImponible, @BaseIva,
              @PorcentajeIva, @CuotaIva, @TotalIva, @ImporteLiquido,
              @ComentarioRecepcion
            )
          `);
      }

      albaranesGenerados.push({
        proveedor: codigoProveedor,
        numeroAlbaran: numeroAlbaran,
        items: itemsProveedor.length,
        total: importeLiquidoTotal,
        esParcial: esParcial,
        numeroParcial: numeroParcial,
        esNuevo: esAlbaranNuevo,  // 🔥 NUEVO: Indicar si es nuevo o actualizado
        itemsDetalle: itemsProveedor.map(item => ({
          CodigoArticulo: item.CodigoArticulo,
          UnidadesRecibidas: item.UnidadesRecibidas,
          DescripcionArticulo: item.DescripcionArticulo
        }))
      });

      console.log(`✅ Albarán ${esAlbaranNuevo ? 'creado' : 'actualizado'} para proveedor ${codigoProveedor}: ${numeroAlbaran} con ${itemsProveedor.length} items`);
    }

    return albaranesGenerados;

  } catch (error) {
    console.error('❌ Error al generar/actualizar albarán de proveedor:', error);
    throw error;
  }
};

// Función principal para procesar recepciones y generar albaranes (ENDPOINT INDEPENDIENTE)
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
            SeriePedido,
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
          SELECT COUNT(DISTINCT CONVERT(DATE, FechaRecepcion)) as TotalRecepciones
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

      // 4. Generar albaranes de compra (usando la función mejorada)
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
          cap.StatusFacturado,
          COUNT(lap.Orden) as TotalItems
        FROM CabeceraAlbaranProveedor cap
        LEFT JOIN LineasAlbaranProveedor lap ON cap.NumeroAlbaran = lap.NumeroAlbaran 
          AND cap.SerieAlbaran = lap.SerieAlbaran
        WHERE cap.NumeroPedido = @NumeroPedido
        GROUP BY 
          cap.NumeroAlbaran, cap.SerieAlbaran, cap.FechaAlbaran,
          cap.CodigoProveedor, cap.RazonSocial, cap.BaseImponible,
          cap.TotalIVA, cap.ImporteLiquido, cap.NumeroLineas, cap.Observaciones, cap.StatusFacturado
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
  generarAlbaranProveedor,
  procesarRecepcionYGenerarAlbaranes,
  getAlbaranesCompraPorPedido
};