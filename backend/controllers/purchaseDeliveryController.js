const { getPool } = require('../db/Sage200db');

// Función para calcular todos los valores financieros - CORREGIDA
const calcularValoresLinea = (precio, unidades, porcentajeIva) => {
  const precioNum = parseFloat(precio) || 0;
  const unidadesNum = parseFloat(unidades) || 0;
  const porcentajeIvaNum = parseFloat(porcentajeIva) || 21;
  
  // Importe Bruto = Precio x Unidades (PrecioVenta YA INCLUYE IVA)
  const importeBruto = precioNum * unidadesNum;
  
  // Base Imponible = Importe Bruto / (1 + (IVA/100)) (total sin IVA)
  const baseImponible = importeBruto / (1 + (porcentajeIvaNum / 100));
  
  // Cuota de IVA = Importe Bruto - Base Imponible (IVA incluido en el total)
  const cuotaIva = importeBruto - baseImponible;
  
  // Importe Líquido = Importe Bruto (mismo valor - CON IVA)
  const importeLiquido = importeBruto;
  
  // Importe Neto = Base Imponible (sin IVA)
  const importeNeto = baseImponible;
  
  // Base IVA = Base Imponible (mismo valor)
  const baseIva = baseImponible;
  
  // Total IVA = Cuota IVA (mismo valor)
  const totalIva = cuotaIva;
  
  // VALIDACIÓN: Asegurar que Base + IVA = Total con IVA
  const validacion = Math.abs((baseImponible + cuotaIva) - importeLiquido) < 0.01;
  if (!validacion) {
    console.warn('⚠️ Validación fallida en cálculo de IVA:', {
      base: baseImponible,
      iva: cuotaIva,
      total: importeLiquido,
      suma: baseImponible + cuotaIva
    });
  }
  
  return {
    importeBruto: parseFloat(importeBruto.toFixed(2)),
    importeNeto: parseFloat(importeNeto.toFixed(2)),
    baseImponible: parseFloat(baseImponible.toFixed(2)),
    baseIva: parseFloat(baseIva.toFixed(2)),
    cuotaIva: parseFloat(cuotaIva.toFixed(2)),
    totalIva: parseFloat(totalIva.toFixed(2)),
    importeLiquido: parseFloat(importeLiquido.toFixed(2)),
    validacion: validacion
  };
};

const generarAlbaranProveedorAutomatico = async (transaction, orderInfo, itemsRecepcionados, codigoEmpresa, esRecepcionParcial = false) => {
  try {
    // Filtrar SOLO items con unidades recibidas > 0
    const itemsRecepcionadosFiltrados = itemsRecepcionados.filter(item => 
      parseFloat(item.UnidadesRecibidas) > 0
    );
    
    if (itemsRecepcionadosFiltrados.length === 0) {
      return [];
    }
    
    // Agrupar items por proveedor
    const itemsPorProveedor = {};
    
    itemsRecepcionadosFiltrados.forEach(item => {
      const proveedor = item.CodigoProveedor;
      if (!itemsPorProveedor[proveedor]) {
        itemsPorProveedor[proveedor] = [];
      }
      itemsPorProveedor[proveedor].push(item);
    });

    // ✅ FECHA CORREGIDA - Formato DATETIME para Sage200/SQL Server
    const now = new Date();
    // Usar UTC para consistencia en todas las zonas horarias
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    // Formato: 'YYYY-MM-DD HH:MM:SS.mmm' (sin 'T', con espacio)
    const fechaAlbaran = `${year}-${month}-${day} 00:00:00.000`;
    
    console.log('📅 Fecha albarán generada:', {
      fecha: fechaAlbaran,
      tipo: typeof fechaAlbaran,
      formato: 'YYYY-MM-DD HH:MM:SS.mmm',
      esValidoParaSQL: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(fechaAlbaran)
    });

    // Verificar si existe columna de observaciones
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
      console.log('No se encontró columna de observaciones:', error.message);
      columnaObservacionesExiste = false;
    }

    const albaranesGenerados = [];

    // Procesar cada proveedor
    for (const [codigoProveedor, itemsProveedor] of Object.entries(itemsPorProveedor)) {
      
      // CASO 1: Buscar albarán NO FACTURADO para este pedido y proveedor
      const albaranNoFacturadoResult = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', orderInfo.EjercicioPedido)
        .input('SeriePedido', orderInfo.SeriePedido)
        .input('NumeroPedido', orderInfo.NumeroPedido)
        .input('CodigoProveedor', codigoProveedor)
        .input('StatusFacturado', 0) // 0 = No facturado
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

      // CASO 3: Buscar albaranes FACTURADOS para calcular unidades ya facturadas
      const albaranFacturadoResult = await transaction.request()
        .input('CodigoEmpresa', codigoEmpresa)
        .input('EjercicioPedido', orderInfo.EjercicioPedido)
        .input('SeriePedido', orderInfo.SeriePedido)
        .input('NumeroPedido', orderInfo.NumeroPedido)
        .input('CodigoProveedor', codigoProveedor)
        .input('StatusFacturado', -1) // -1 = Facturado
        .query(`
          SELECT 
            lap.CodigoArticulo,
            SUM(lap.UnidadesRecibidas) as UnidadesFacturadas
          FROM CabeceraAlbaranProveedor cap
          INNER JOIN LineasAlbaranProveedor lap 
            ON cap.NumeroAlbaran = lap.NumeroAlbaran 
            AND cap.SerieAlbaran = lap.SerieAlbaran
            AND cap.EjercicioAlbaran = lap.EjercicioAlbaran
          WHERE cap.CodigoEmpresa = @CodigoEmpresa
            AND cap.EjercicioPedido = @EjercicioPedido
            AND cap.SeriePedido = @SeriePedido  
            AND cap.NumeroPedido = @NumeroPedido
            AND cap.CodigoProveedor = @CodigoProveedor
            AND cap.StatusFacturado = @StatusFacturado
          GROUP BY lap.CodigoArticulo
        `);

      // Crear mapa de unidades facturadas por artículo
      const unidadesFacturadasMap = new Map();
      if (albaranFacturadoResult.recordset.length > 0) {
        albaranFacturadoResult.recordset.forEach(row => {
          unidadesFacturadasMap.set(row.CodigoArticulo, parseFloat(row.UnidadesFacturadas) || 0);
        });
      }

      let numeroAlbaran;
      let esAlbaranNuevo = false;
      let albaranExistente = null;

      // CASO 2: Si hay albarán NO FACTURADO -> Actualizar
      if (albaranNoFacturadoResult.recordset.length > 0) {
        albaranExistente = albaranNoFacturadoResult.recordset[0];
        numeroAlbaran = albaranExistente.NumeroAlbaran;
        esAlbaranNuevo = false;
        
        // Verificar que el albarán realmente existe
        const verifyAlbaran = await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .input('SerieAlbaran', albaranExistente.SerieAlbaran || 'WebCP')
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', albaranExistente.EjercicioAlbaran || now.getFullYear())
          .query(`
            SELECT COUNT(*) as Existe
            FROM CabeceraAlbaranProveedor
            WHERE NumeroAlbaran = @NumeroAlbaran 
              AND SerieAlbaran = @SerieAlbaran
              AND CodigoEmpresa = @CodigoEmpresa
              AND EjercicioAlbaran = @EjercicioAlbaran
          `);
          
        if (verifyAlbaran.recordset[0].Existe === 0) {
          esAlbaranNuevo = true;
        }
      } else {
        // CASO 1 o 3: Crear NUEVO ALBARÁN
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

      // OBTENER DATOS DEL PROVEEDOR
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

      // SI ES ALBARÁN NUEVO, INSERTAR CABECERA
      if (esAlbaranNuevo) {
        const estadoRecepcion = esRecepcionParcial ? '(Parcial)' : '(Completado)';
        const textoObservaciones = `Albarán Automático para el pedido ${orderInfo.NumeroPedido} ${estadoRecepcion}`;
        
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
              @FechaAlbaran, 0, 0, 0, 0, @ObservacionesAlbaran, @StatusFacturado
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
            .input('FechaAlbaran', fechaAlbaran) // ✅ Formato corregido
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
            .input('FechaAlbaran', fechaAlbaran) // ✅ Formato corregido
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
                @FechaAlbaran, 0, 0, 0, 0, @StatusFacturado
              )
            `);
        }
      }

      // OBTENER LÍNEAS EXISTENTES de ESTE albarán (no facturado)
      let lineasExistentesResult = { recordset: [] };
      if (!esAlbaranNuevo && albaranExistente) {
        lineasExistentesResult = await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .input('SerieAlbaran', albaranExistente.SerieAlbaran || 'WebCP')
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', albaranExistente.EjercicioAlbaran || now.getFullYear())
          .query(`
            SELECT 
              Orden,
              CodigoArticulo,
              EjercicioPedido,
              SeriePedido,
              NumeroPedido,
              Unidades,
              UnidadesRecibidas,
              Unidades2_,
              Precio,
              [%Iva] as PorcentajeIva,
              DescripcionArticulo,
              ComentarioRecepcion
            FROM LineasAlbaranProveedor
            WHERE NumeroAlbaran = @NumeroAlbaran 
              AND SerieAlbaran = @SerieAlbaran
              AND CodigoEmpresa = @CodigoEmpresa
              AND EjercicioAlbaran = @EjercicioAlbaran
          `);
      }

      // Crear mapa de líneas existentes por artículo
      const lineasExistentesMap = new Map();
      lineasExistentesResult.recordset.forEach(linea => {
        const key = `${linea.CodigoArticulo}-${linea.EjercicioPedido}-${linea.SeriePedido}-${linea.NumeroPedido}`;
        lineasExistentesMap.set(key, linea);
      });

      // Calcular el siguiente orden disponible
      let siguienteOrden = 1;
      if (lineasExistentesResult.recordset.length > 0) {
        const maxOrdenResult = await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .input('SerieAlbaran', albaranExistente?.SerieAlbaran || 'WebCP')
          .input('EjercicioAlbaran', albaranExistente?.EjercicioAlbaran || now.getFullYear())
          .input('CodigoEmpresa', codigoEmpresa)
          .query(`
            SELECT ISNULL(MAX(Orden), 0) as MaxOrden
            FROM LineasAlbaranProveedor
            WHERE NumeroAlbaran = @NumeroAlbaran 
              AND SerieAlbaran = @SerieAlbaran
              AND EjercicioAlbaran = @EjercicioAlbaran
              AND CodigoEmpresa = @CodigoEmpresa
          `);
        siguienteOrden = (maxOrdenResult.recordset[0]?.MaxOrden || 0) + 1;
      }

      // Procesar cada item del proveedor
      let baseImponibleTotal = 0;
      let totalIVATotal = 0;
      let importeLiquidoTotal = 0;
      let itemsProcesados = [];

      for (const item of itemsProveedor) {
        const unidadesDeseadas = parseFloat(item.UnidadesRecibidas) || 0;
        
        // CALCULAR UNIDADES A PROCESAR
        let unidadesAProcesar = unidadesDeseadas;
        
        // CASO 3: Si hay unidades facturadas, descontarlas
        if (unidadesFacturadasMap.has(item.CodigoArticulo)) {
          const unidadesYaFacturadas = unidadesFacturadasMap.get(item.CodigoArticulo);
          unidadesAProcesar = unidadesDeseadas - unidadesYaFacturadas;
          
          // Si ya está todo facturado, no procesamos más
          if (unidadesAProcesar <= 0) {
            continue;
          }
        }

        const claveItem = `${item.CodigoArticulo}-${orderInfo.EjercicioPedido}-${orderInfo.SeriePedido}-${orderInfo.NumeroPedido}`;
        const lineaExistente = lineasExistentesMap.get(claveItem);
        
        const precio = parseFloat(item.Precio) || 0;
        const porcentajeIva = parseFloat(item.PorcentajeIva) || 21;
        
        // CALCULAR TODOS LOS VALORES FINANCIEROS (CORREGIDO)
        const valoresCalculados = calcularValoresLinea(precio, unidadesAProcesar, porcentajeIva);

        baseImponibleTotal += valoresCalculados.baseImponible;
        totalIVATotal += valoresCalculados.totalIva;
        importeLiquidoTotal += valoresCalculados.importeLiquido;

        if (lineaExistente) {
          // CASO 2: ACTUALIZAR LÍNEA EXISTENTE con todos los cálculos
          const descripcionCorta = item.DescripcionArticulo && item.DescripcionArticulo.length > 100 
            ? item.DescripcionArticulo.substring(0, 97) + '...' 
            : item.DescripcionArticulo;

          const comentarioExistente = lineaExistente.ComentarioRecepcion || '';
          const comentarioNuevo = item.ComentarioRecepcion || `Actualización: ${unidadesAProcesar} unidades`;
          const comentarioCombinado = comentarioExistente 
            ? `${comentarioExistente}; ${comentarioNuevo}`
            : comentarioNuevo;

          const comentarioCorto = comentarioCombinado.length > 200
            ? comentarioCombinado.substring(0, 197) + '...'
            : comentarioCombinado;

          await transaction.request()
            .input('NumeroAlbaran', numeroAlbaran)
            .input('SerieAlbaran', albaranExistente?.SerieAlbaran || 'WebCP')
            .input('EjercicioAlbaran', albaranExistente?.EjercicioAlbaran || now.getFullYear())
            .input('CodigoEmpresa', codigoEmpresa)
            .input('Orden', lineaExistente.Orden)
            .input('CodigoArticulo', item.CodigoArticulo)
            .input('EjercicioPedido', orderInfo.EjercicioPedido)
            .input('SeriePedido', orderInfo.SeriePedido)
            .input('NumeroPedido', orderInfo.NumeroPedido)
            .input('Unidades', unidadesAProcesar)
            .input('UnidadesRecibidas', unidadesAProcesar)
            .input('Unidades2_', unidadesAProcesar)
            .input('Precio', precio)
            .input('ImporteBruto', valoresCalculados.importeBruto)
            .input('ImporteNeto', valoresCalculados.importeNeto)
            .input('BaseImponible', valoresCalculados.baseImponible)
            .input('BaseIva', valoresCalculados.baseIva)
            .input('PorcentajeIva', porcentajeIva)
            .input('CuotaIva', valoresCalculados.cuotaIva)
            .input('TotalIva', valoresCalculados.totalIva)
            .input('ImporteLiquido', valoresCalculados.importeLiquido)
            .input('ComentarioRecepcion', comentarioCorto)
            .input('DescripcionArticulo', descripcionCorta)
            .query(`
              UPDATE LineasAlbaranProveedor 
              SET 
                Unidades = @Unidades,
                UnidadesRecibidas = @UnidadesRecibidas,
                Unidades2_ = @Unidades2_,
                Precio = @Precio,
                ImporteBruto = @ImporteBruto,
                ImporteNeto = @ImporteNeto,
                BaseImponible = @BaseImponible,
                BaseIva = @BaseIva,
                [%Iva] = @PorcentajeIva,
                CuotaIva = @CuotaIva,
                TotalIva = @TotalIva,
                ImporteLiquido = @ImporteLiquido,
                ComentarioRecepcion = @ComentarioRecepcion,
                DescripcionArticulo = @DescripcionArticulo
              WHERE NumeroAlbaran = @NumeroAlbaran 
                AND SerieAlbaran = @SerieAlbaran
                AND EjercicioAlbaran = @EjercicioAlbaran
                AND CodigoEmpresa = @CodigoEmpresa
                AND Orden = @Orden
                AND CodigoArticulo = @CodigoArticulo
                AND EjercicioPedido = @EjercicioPedido
                AND SeriePedido = @SeriePedido
                AND NumeroPedido = @NumeroPedido
            `);
        } else {
          // CASO 1 o 3: INSERTAR NUEVA LÍNEA con todos los cálculos
          const orden = siguienteOrden;
          const descripcionCorta = item.DescripcionArticulo && item.DescripcionArticulo.length > 100 
            ? item.DescripcionArticulo.substring(0, 97) + '...' 
            : item.DescripcionArticulo;

          const comentarioCorto = item.ComentarioRecepcion && item.ComentarioRecepcion.length > 200
            ? item.ComentarioRecepcion.substring(0, 197) + '...'
            : (item.ComentarioRecepcion || `Recepción: ${unidadesAProcesar} unidades`);

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
            .input('Unidades', unidadesAProcesar)
            .input('UnidadesRecibidas', unidadesAProcesar)
            .input('Unidades2_', unidadesAProcesar)
            .input('Precio', precio)
            .input('ImporteBruto', valoresCalculados.importeBruto)
            .input('ImporteNeto', valoresCalculados.importeNeto)
            .input('BaseImponible', valoresCalculados.baseImponible)
            .input('BaseIva', valoresCalculados.baseIva)
            .input('PorcentajeIva', porcentajeIva)
            .input('CuotaIva', valoresCalculados.cuotaIva)
            .input('TotalIva', valoresCalculados.totalIva)
            .input('ImporteLiquido', valoresCalculados.importeLiquido)
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
            
          siguienteOrden++;
        }

        itemsProcesados.push({
          CodigoArticulo: item.CodigoArticulo,
          DescripcionArticulo: item.DescripcionArticulo,
          UnidadesProcesadas: unidadesAProcesar,
          UnidadesDeseadas: unidadesDeseadas,
          UnidadesFacturadas: unidadesFacturadasMap.get(item.CodigoArticulo) || 0,
          Precio: precio,
          PorcentajeIva: porcentajeIva,
          ImporteBruto: valoresCalculados.importeBruto,
          ImporteLiquido: valoresCalculados.importeLiquido,
          Total: valoresCalculados.importeLiquido
        });
      }

      // Contar número de líneas
      const lineasCountResult = await transaction.request()
        .input('NumeroAlbaran', numeroAlbaran)
        .input('SerieAlbaran', albaranExistente?.SerieAlbaran || 'WebCP')
        .input('EjercicioAlbaran', albaranExistente?.EjercicioAlbaran || now.getFullYear())
        .input('CodigoEmpresa', codigoEmpresa)
        .query(`
          SELECT COUNT(*) as NumeroLineas
          FROM LineasAlbaranProveedor
          WHERE NumeroAlbaran = @NumeroAlbaran 
            AND SerieAlbaran = @SerieAlbaran
            AND EjercicioAlbaran = @EjercicioAlbaran
            AND CodigoEmpresa = @CodigoEmpresa
        `);

      const numeroLineasFinal = lineasCountResult.recordset[0]?.NumeroLineas || 0;

      // ACTUALIZAR CABECERA CON TOTALES CALCULADOS
      const estadoRecepcion = esRecepcionParcial ? '(Parcial)' : '(Completado)';
      const textoObservaciones = `Albarán Automático para el pedido ${orderInfo.NumeroPedido} ${estadoRecepcion}`;

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
          WHERE NumeroAlbaran = @NumeroAlbaran 
            AND SerieAlbaran = @SerieAlbaran
            AND CodigoEmpresa = @CodigoEmpresa
            AND EjercicioAlbaran = @EjercicioAlbaran
        `;
        
        await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .input('SerieAlbaran', albaranExistente?.SerieAlbaran || 'WebCP')
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', albaranExistente?.EjercicioAlbaran || now.getFullYear())
          .input('BaseImponible', baseImponibleTotal)
          .input('TotalIVA', totalIVATotal)
          .input('ImporteLiquido', importeLiquidoTotal)
          .input('NumeroLineas', numeroLineasFinal)
          .input('ObservacionesAlbaran', textoObservaciones)
          .input('FechaAlbaran', fechaAlbaran) // ✅ Formato corregido
          .query(updateQuery);
      } else {
        await transaction.request()
          .input('NumeroAlbaran', numeroAlbaran)
          .input('SerieAlbaran', albaranExistente?.SerieAlbaran || 'WebCP')
          .input('CodigoEmpresa', codigoEmpresa)
          .input('EjercicioAlbaran', albaranExistente?.EjercicioAlbaran || now.getFullYear())
          .input('BaseImponible', baseImponibleTotal)
          .input('TotalIVA', totalIVATotal)
          .input('ImporteLiquido', importeLiquidoTotal)
          .input('NumeroLineas', numeroLineasFinal)
          .input('FechaAlbaran', fechaAlbaran) // ✅ Formato corregido
          .query(`
            UPDATE CabeceraAlbaranProveedor 
            SET 
              BaseImponible = @BaseImponible,
              TotalIVA = @TotalIVA,
              ImporteLiquido = @ImporteLiquido,
              NumeroLineas = @NumeroLineas,
              FechaAlbaran = @FechaAlbaran
            WHERE NumeroAlbaran = @NumeroAlbaran 
              AND SerieAlbaran = @SerieAlbaran
              AND CodigoEmpresa = @CodigoEmpresa
              AND EjercicioAlbaran = @EjercicioAlbaran
          `);
      }

      albaranesGenerados.push({
        proveedor: codigoProveedor,
        nombreProveedor: proveedor.RazonSocial,
        numeroAlbaran: numeroAlbaran,
        serieAlbaran: albaranExistente?.SerieAlbaran || 'WebCP',
        ejercicioAlbaran: albaranExistente?.EjercicioAlbaran || now.getFullYear(),
        items: itemsProcesados.length,
        baseImponible: baseImponibleTotal,
        totalIVA: totalIVATotal,
        total: importeLiquidoTotal,
        esParcial: esRecepcionParcial,
        ComentarioRecepcion: itemsProcesados[0]?.ComentarioRecepcion || 'Recepción automática',
        esNuevo: esAlbaranNuevo,
        tieneObservaciones: columnaObservacionesExiste,
        textoObservaciones: textoObservaciones,
        itemsDetalle: itemsProcesados
      });
    }

    return albaranesGenerados;

  } catch (error) {
    console.error('Error en generarAlbaranProveedorAutomatico:', error);
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

      // Filtrar items con unidades recibidas
      const itemsRecepcionados = items.filter(item => 
        parseFloat(item.UnidadesRecibidas) > 0
      );

      if (itemsRecepcionados.length === 0) {
        throw new Error('No hay unidades recepcionadas para generar albarán');
      }

      // Obtener información completa de los artículos del pedido
      const articulosInfo = [];
      for (const item of itemsRecepcionados) {
        const articuloResult = await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
          .input('CodigoArticulo', item.CodigoArticulo)
          .input('Orden', item.Orden)
          .query(`
            SELECT 
              lpc.Orden,
              lpc.CodigoArticulo,
              lpc.DescripcionArticulo,
              lpc.UnidadesPedidas,
              lpc.UnidadesRecibidas as UnidadesRecibidasActuales,
              lpc.Precio,
              lpc.CodigoProveedor,
              lpc.[%Iva] as PorcentajeIva,
              lpc.GrupoIva
            FROM LineasPedidoCliente lpc
            WHERE lpc.NumeroPedido = @NumeroPedido 
              AND lpc.SeriePedido = @SeriePedido
              AND lpc.CodigoArticulo = @CodigoArticulo
              AND lpc.Orden = @Orden
          `);

        if (articuloResult.recordset.length > 0) {
          const articulo = articuloResult.recordset[0];
          
          // Validar que no se exceda lo pedido
          const unidadesDeseadas = parseFloat(item.UnidadesRecibidas) || 0;
          const unidadesPedidas = parseFloat(articulo.UnidadesPedidas) || 0;
          
          if (unidadesDeseadas > unidadesPedidas) {
            throw new Error(`Las unidades recibidas (${unidadesDeseadas}) exceden lo pedido (${unidadesPedidas}) para el artículo ${articulo.CodigoArticulo}`);
          }
          
          articulosInfo.push({
            Orden: articulo.Orden,
            CodigoArticulo: articulo.CodigoArticulo,
            DescripcionArticulo: articulo.DescripcionArticulo,
            UnidadesRecibidas: unidadesDeseadas,
            Precio: parseFloat(articulo.Precio) || 0,
            CodigoProveedor: articulo.CodigoProveedor,
            PorcentajeIva: parseFloat(articulo.PorcentajeIva) || 21,
            GrupoIva: articulo.GrupoIva,
            ComentarioRecepcion: item.ComentarioRecepcion || 'Recepción automática'
          });
        }
      }

      if (articulosInfo.length === 0) {
        throw new Error('Los artículos recepcionados no corresponden al pedido');
      }

      // Verificar si es recepción parcial
      let esRecepcionParcial = false;
      
      // Verificar manualmente cada artículo para ver si es parcial
      for (const articulo of articulosInfo) {
        const articuloPedidoResult = await transaction.request()
          .input('NumeroPedido', orderId)
          .input('SeriePedido', 'WebCD')
          .input('CodigoArticulo', articulo.CodigoArticulo)
          .input('Orden', articulo.Orden)
          .query(`
            SELECT UnidadesPedidas
            FROM LineasPedidoCliente
            WHERE NumeroPedido = @NumeroPedido 
              AND SeriePedido = @SeriePedido
              AND CodigoArticulo = @CodigoArticulo
              AND Orden = @Orden
          `);
        
        const unidadesPedidas = articuloPedidoResult.recordset[0]?.UnidadesPedidas || 0;
        
        if (articulo.UnidadesRecibidas < unidadesPedidas) {
          esRecepcionParcial = true;
          break;
        }
      }

      // Generar albaranes
      const albaranesGenerados = await generarAlbaranProveedorAutomatico(
        transaction, 
        orderInfo, 
        articulosInfo, 
        orderInfo.CodigoEmpresa,
        esRecepcionParcial
      );

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: `Recepción procesada y ${albaranesGenerados.length} albarán(es) procesado(s) correctamente`,
        albaranesGenerados: albaranesGenerados,
        itemsProcesados: articulosInfo.length,
        esRecepcionParcial: esRecepcionParcial,
        nota: "El sistema maneja automáticamente albaranes facturados y no facturados"
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error en procesarRecepcionYGenerarAlbaranes:', err);
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Error al procesar la recepción y generar albaranes'
      });
    }
  } catch (error) {
    console.error('Error en procesarRecepcionYGenerarAlbaranes:', error);
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
          AND cap.EjercicioAlbaran = lap.EjercicioAlbaran
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
    console.error('Error en getAlbaranesCompraPorPedido:', error);
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