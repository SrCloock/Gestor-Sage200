const { getPool } = require('../db/Sage200db');

const generarAlbaranProveedorAutomatico = async (transaction, orderInfo, itemsRecepcionados, codigoEmpresa, esRecepcionParcial = false) => {
  try {
    const itemsPorProveedor = {};
    
    itemsRecepcionados.forEach(item => {
      const proveedor = item.CodigoProveedor || 'DEFAULT';
      if (!itemsPorProveedor[proveedor]) {
        itemsPorProveedor[proveedor] = [];
      }
      itemsPorProveedor[proveedor].push(item);
    });

    const now = new Date();
    const fechaLocal = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    const fechaStr = fechaLocal.toISOString().split('T')[0] + ' 00:00:00.000';
    const fechaAlbaran = fechaStr;

    let columnaObservacionesExiste = false;
    let nombreColumnaObservaciones = 'ObservacionesAlbaran';
    
    try {
      const testResult = await transaction.request()
        .query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'CabeceraAlbaranProveedor' 
          AND COLUMN_NAME = 'ObservacionesAlbaran'
        `);
      columnaObservacionesExiste = testResult.recordset.length > 0;
      
      if (!columnaObservacionesExiste) {
        const testResultPlural = await transaction.request()
          .query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'CabeceraAlbaranProveedor' 
            AND COLUMN_NAME = 'ObservacionesAlbaranes'
          `);
        if (testResultPlural.recordset.length > 0) {
          columnaObservacionesExiste = true;
          nombreColumnaObservaciones = 'ObservacionesAlbaranes';
        }
      }
    } catch (error) {
      columnaObservacionesExiste = false;
    }

    const albaranesGenerados = [];

    for (const [codigoProveedor, itemsProveedor] of Object.entries(itemsPorProveedor)) {
      const albaranExistenteResult = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', orderInfo.EjercicioPedido)
        .input('SeriePedido', orderInfo.SeriePedido)
        .input('NumeroPedido', orderInfo.NumeroPedido)
        .input('CodigoProveedor', codigoProveedor)
        .input('StatusFacturado', 0)
        .query(`
          SELECT 
            cap.NumeroAlbaran,
            cap.SerieAlbaran,
            cap.EjercicioAlbaran,
            cap.BaseImponible,
            cap.TotalIVA,
            cap.ImporteLiquido,
            cap.NumeroLineas,
            ${columnaObservacionesExiste ? `cap.${nombreColumnaObservaciones} as Observaciones` : `'' as Observaciones`}
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
        albaranExistente = albaranExistenteResult.recordset[0];
        numeroAlbaran = albaranExistente.NumeroAlbaran;
      } else {
        const albaranResult = await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', now.getFullYear())
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
      }

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

      let baseImponibleTotal = 0;
      let totalIVATotal = 0;
      let importeBrutoTotal = 0;

      itemsProveedor.forEach(item => {
        const precio = item.Precio || 0;
        const unidades = item.UnidadesRecibidas || 0;
        const porcentajeIva = item.PorcentajeIva || 21;

        const baseImponible = (precio * unidades) / (1 + (porcentajeIva / 100));
        const ivaLinea = baseImponible * (porcentajeIva / 100);
        const importeBruto = precio * unidades;

        baseImponibleTotal += baseImponible;
        totalIVATotal += ivaLinea;
        importeBrutoTotal += importeBruto;
      });

      let importeLiquidoTotal = baseImponibleTotal + totalIVATotal;
      let numeroLineasFinal = itemsProveedor.length;

      if (albaranExistente) {
        baseImponibleTotal += parseFloat(albaranExistente.BaseImponible) || 0;
        totalIVATotal += parseFloat(albaranExistente.TotalIVA) || 0;
        importeLiquidoTotal = baseImponibleTotal + totalIVATotal;
        numeroLineasFinal = (albaranExistente.NumeroLineas || 0) + itemsProveedor.length;
      }

      const estadoRecepcion = esRecepcionParcial ? '(Parcial)' : '(Completado)';
      const textoObservaciones = `Albarán Automático para el pedido ${orderInfo.NumeroPedido} ${estadoRecepcion}`;

      if (esAlbaranNuevo) {
        if (columnaObservacionesExiste) {
          const insertQuery = `
            INSERT INTO CabeceraAlbaranProveedor (
              CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran,
              EjercicioPedido, SeriePedido, NumeroPedido,
              CodigoProveedor, RazonSocial, Nombre, CifDni, CifEuropeo,
              Domicilio, CodigoPostal, Municipio, Provincia, CodigoNacion, Nacion,
              FechaAlbaran, BaseImponible, TotalIVA, ImporteLiquido,
              NumeroLineas, ${nombreColumnaObservaciones}, StatusFacturado
            ) VALUES (
              @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran,
              @EjercicioPedido, @SeriePedido, @NumeroPedido,
              @CodigoProveedor, @RazonSocial, @Nombre, @CifDni, @CifEuropeo,
              @Domicilio, @CodigoPostal, @Municipio, @Provincia, @CodigoNacion, @Nacion,
              @FechaAlbaran, @BaseImponible, @TotalIVA, @ImporteLiquido,
              @NumeroLineas, @ObservacionesAlbaran, @StatusFacturado
            )
          `;
          
          await transaction.request()
            .input('CodigoEmpresa', codigoEmpresa)
            .input('EjercicioAlbaran', now.getFullYear())
            .input('SerieAlbaran', 'WebCP')
            .input('NumeroAlbaran', numeroAlbaran)
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
            .input('FechaAlbaran', fechaAlbaran)
            .input('BaseImponible', baseImponibleTotal)
            .input('TotalIVA', totalIVATotal)
            .input('ImporteLiquido', importeLiquidoTotal)
            .input('NumeroLineas', numeroLineasFinal)
            .input('ObservacionesAlbaran', textoObservaciones)
            .input('StatusFacturado', 0)
            .query(insertQuery);
        } else {
          await transaction.request()
            .input('CodigoEmpresa', codigoEmpresa)
            .input('EjercicioAlbaran', now.getFullYear())
            .input('SerieAlbaran', 'WebCP')
            .input('NumeroAlbaran', numeroAlbaran)
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
            .input('FechaAlbaran', fechaAlbaran)
            .input('BaseImponible', baseImponibleTotal)
            .input('TotalIVA', totalIVATotal)
            .input('ImporteLiquido', importeLiquidoTotal)
            .input('NumeroLineas', numeroLineasFinal)
            .input('StatusFacturado', 0)
            .query(`
              INSERT INTO CabeceraAlbaranProveedor (
                CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran,
                EjercicioPedido, SeriePedido, NumeroPedido,
                CodigoProveedor, RazonSocial, Nombre, CifDni, CifEuropeo,
                Domicilio, CodigoPostal, Municipio, Provincia, CodigoNacion, Nacion,
                FechaAlbaran, BaseImponible, TotalIVA, ImporteLiquido,
                NumeroLineas, StatusFacturado
              ) VALUES (
                @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran,
                @EjercicioPedido, @SeriePedido, @NumeroPedido,
                @CodigoProveedor, @RazonSocial, @Nombre, @CifDni, @CifEuropeo,
                @Domicilio, @CodigoPostal, @Municipio, @Provincia, @CodigoNacion, @Nacion,
                @FechaAlbaran, @BaseImponible, @TotalIVA, @ImporteLiquido,
                @NumeroLineas, @StatusFacturado
              )
            `);
        }
      } else {
        if (columnaObservacionesExiste) {
          const updateQuery = `
            UPDATE CabeceraAlbaranProveedor 
            SET 
              BaseImponible = @BaseImponible,
              TotalIVA = @TotalIVA,
              ImporteLiquido = @ImporteLiquido,
              NumeroLineas = @NumeroLineas,
              ${nombreColumnaObservaciones} = @ObservacionesAlbaran,
              FechaAlbaran = @FechaAlbaran
            WHERE NumeroAlbaran = @NumeroAlbaran AND SerieAlbaran = @SerieAlbaran
          `;
          
          await transaction.request()
            .input('NumeroAlbaran', numeroAlbaran)
            .input('SerieAlbaran', 'WebCP')
            .input('BaseImponible', baseImponibleTotal)
            .input('TotalIVA', totalIVATotal)
            .input('ImporteLiquido', importeLiquidoTotal)
            .input('NumeroLineas', numeroLineasFinal)
            .input('ObservacionesAlbaran', textoObservaciones)
            .input('FechaAlbaran', fechaAlbaran)
            .query(updateQuery);
        } else {
          await transaction.request()
            .input('NumeroAlbaran', numeroAlbaran)
            .input('SerieAlbaran', 'WebCP')
            .input('BaseImponible', baseImponibleTotal)
            .input('TotalIVA', totalIVATotal)
            .input('ImporteLiquido', importeLiquidoTotal)
            .input('NumeroLineas', numeroLineasFinal)
            .input('FechaAlbaran', fechaAlbaran)
            .query(`
              UPDATE CabeceraAlbaranProveedor 
              SET 
                BaseImponible = @BaseImponible,
                TotalIVA = @TotalIVA,
                ImporteLiquido = @ImporteLiquido,
                NumeroLineas = @NumeroLineas,
                FechaAlbaran = @FechaAlbaran
              WHERE NumeroAlbaran = @NumeroAlbaran AND SerieAlbaran = @SerieAlbaran
            `);
        }
      }

      let ordenInicio = 1;
      if (!esAlbaranNuevo) {
        const maxOrdenResult = await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .input('SerieAlbaran', 'WebCP')
          .query(`
            SELECT ISNULL(MAX(Orden), 0) as MaxOrden
            FROM LineasAlbaranProveedor
            WHERE NumeroAlbaran = @NumeroAlbaran AND SerieAlbaran = @SerieAlbaran
          `);
        ordenInicio = maxOrdenResult.recordset[0].MaxOrden + 1;
      }

      for (const [index, item] of itemsProveedor.entries()) {
        const orden = ordenInicio + index;
        const precio = item.Precio || 0;
        const unidades = item.UnidadesRecibidas || 0;
        const porcentajeIva = item.PorcentajeIva || 21;

        const baseImponible = (precio * unidades) / (1 + (porcentajeIva / 100));
        const ivaLinea = baseImponible * (porcentajeIva / 100);
        const importeLiquido = baseImponible + ivaLinea;
        const importeBruto = precio * unidades;

        const descripcionCorta = item.DescripcionArticulo && item.DescripcionArticulo.length > 100 
          ? item.DescripcionArticulo.substring(0, 97) + '...' 
          : item.DescripcionArticulo;

        const comentarioCorto = item.ComentarioRecepcion && item.ComentarioRecepcion.length > 200
          ? item.ComentarioRecepcion.substring(0, 197) + '...'
          : (item.ComentarioRecepcion || 'Recepción automática');

        await transaction.request()
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', now.getFullYear())
          .input('SerieAlbaran', 'WebCP')
          .input('NumeroAlbaran', numeroAlbaran)
          .input('Orden', orden)
          .input('EjercicioPedido', orderInfo.EjercicioPedido)
          .input('SeriePedido', orderInfo.SeriePedido)
          .input('NumeroPedido', orderInfo.NumeroPedido)
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('DescripcionArticulo', descripcionCorta)
          .input('Unidades', unidades)
          .input('UnidadesRecibidas', unidades)
          .input('Unidades2_', unidades)
          .input('Precio', precio)
          .input('ImporteBruto', importeBruto)
          .input('ImporteNeto', importeBruto)
          .input('BaseImponible', baseImponible)
          .input('BaseIva', baseImponible)
          .input('PorcentajeIva', porcentajeIva)
          .input('CuotaIva', ivaLinea)
          .input('TotalIva', ivaLinea)
          .input('ImporteLiquido', importeLiquido)
          .input('ComentarioRecepcion', comentarioCorto)
          .query(`
            INSERT INTO LineasAlbaranProveedor (
              CodigoEmpresa, EjercicioAlbaran, SerieAlbaran, NumeroAlbaran, Orden,
              EjercicioPedido, SeriePedido, NumeroPedido,
              CodigoArticulo, DescripcionArticulo,
              Unidades, UnidadesRecibidas, Unidades2_, Precio,
              ImporteBruto, ImporteNeto, 
              BaseImponible, BaseIva,
              [%Iva], CuotaIva, TotalIva, ImporteLiquido,
              ComentarioRecepcion
            ) VALUES (
              @CodigoEmpresa, @EjercicioAlbaran, @SerieAlbaran, @NumeroAlbaran, @Orden,
              @EjercicioPedido, @SeriePedido, @NumeroPedido,
              @CodigoArticulo, @DescripcionArticulo,
              @Unidades, @UnidadesRecibidas, @Unidades2_, @Precio,
              @ImporteBruto, @ImporteNeto,
              @BaseImponible, @BaseIva,
              @PorcentajeIva, @CuotaIva, @TotalIva, @ImporteLiquido,
              @ComentarioRecepcion
            )
          `);
      }

      const comentarioRecepcionFinal = itemsProveedor[0]?.ComentarioRecepcion || 'Recepción automática';

      albaranesGenerados.push({
        proveedor: codigoProveedor,
        nombreProveedor: proveedor.RazonSocial,
        numeroAlbaran: numeroAlbaran,
        items: itemsProveedor.length,
        total: importeLiquidoTotal,
        esParcial: esRecepcionParcial,
        ComentarioRecepcion: comentarioRecepcionFinal,
        esNuevo: esAlbaranNuevo,
        tieneObservaciones: columnaObservacionesExiste,
        textoObservaciones: textoObservaciones,
        itemsDetalle: itemsProveedor.map(item => ({
          CodigoArticulo: item.CodigoArticulo,
          DescripcionArticulo: item.DescripcionArticulo,
          UnidadesRecibidas: item.UnidadesRecibidas,
          Precio: item.Precio,
          Total: (item.Precio || 0) * (item.UnidadesRecibidas || 0)
        }))
      });
    }

    return albaranesGenerados;

  } catch (error) {
    throw error;
  }
};

const procesarRecepcionYGenerarAlbaranes = async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;

  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
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

      const itemsRecepcionados = items.filter(item => 
        item.UnidadesRecibidas > 0 && item.UnidadesRecibidas !== null
      );

      if (itemsRecepcionados.length === 0) {
        throw new Error('No hay unidades recepcionadas para generar albarán');
      }

      const albaranesGenerados = await generarAlbaranProveedorAutomatico(
        transaction, 
        orderInfo, 
        itemsRecepcionados, 
        orderInfo.CodigoEmpresa,
        true
      );

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: `Recepción procesada y ${albaranesGenerados.length} albarán(es) procesado(s) correctamente`,
        albaranesGenerados: albaranesGenerados
      });

    } catch (err) {
      await transaction.rollback();
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Error al procesar la recepción y generar albaranes'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al procesar la recepción'
    });
  }
};

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
          cap.StatusFacturado,
          COUNT(lap.Orden) as TotalItems
        FROM CabeceraAlbaranProveedor cap
        LEFT JOIN LineasAlbaranProveedor lap ON cap.NumeroAlbaran = lap.NumeroAlbaran 
          AND cap.SerieAlbaran = lap.SerieAlbaran
        WHERE cap.NumeroPedido = @NumeroPedido
        GROUP BY 
          cap.NumeroAlbaran, cap.SerieAlbaran, cap.FechaAlbaran,
          cap.CodigoProveedor, cap.RazonSocial, cap.BaseImponible,
          cap.TotalIVA, cap.ImporteLiquido, cap.NumeroLineas, cap.StatusFacturado
        ORDER BY cap.FechaAlbaran DESC
      `);

    res.status(200).json({
      success: true,
      albaranes: result.recordset
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el historial de albaranes de compra'
    });
  }
};

module.exports = {
  generarAlbaranProveedorAutomatico,
  procesarRecepcionYGenerarAlbaranes,
  getAlbaranesCompraPorPedido
};