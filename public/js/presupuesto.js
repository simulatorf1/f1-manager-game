// ========================
// PRESUPUESTO.JS - Sistema de registro financiero REAL
// ========================
console.log('💰 Sistema de presupuesto REAL cargado');

class PresupuestoManager {
    constructor() {
        this.supabase = window.supabase;
        this.escuderia = null;
        this.transacciones = [];
        this.ultimaActualizacion = null;
        this.semanaInicio = this.obtenerInicioSemana();
        this.categorias = {
            'produccion': 'Fabricación',
            'mercado': 'Mercado',
            'sueldos': 'Sueldos',
            'apuestas': 'Apuestas',
            'ingresos': 'Ingresos',
            'otros': 'Otros'
        };
    }

    // Obtener el lunes de la semana actual
    obtenerInicioSemana() {
        const hoy = new Date();
        const lunes = new Date(hoy);
        const dia = hoy.getDay(); // 0=domingo, 1=lunes...
        const diff = dia === 0 ? 6 : dia - 1; // Si es domingo, retrocede 6 días
        lunes.setDate(hoy.getDate() - diff);
        lunes.setHours(0, 0, 0, 0);
        return lunes;
    }

    async inicializar(escuderia) {
        console.log('💰 Inicializando PresupuestoManager para:', escuderia.nombre);
        this.escuderia = escuderia;
        await this.cargarTransaccionesCompletas();
        return true;
    }

    // Cargar TODAS las transacciones históricas para calcular presupuesto inicial
    async cargarTransaccionesCompletas() {
        try {
            const { data, error } = await this.supabase
                .from('transacciones')
                .select('*')
                .eq('escuderia_id', this.escuderia.id)
                .order('fecha', { ascending: false });

            if (error) throw error;
            
            this.transacciones = data || [];
            this.ultimaActualizacion = new Date();
            console.log(`📊 ${this.transacciones.length} transacciones históricas cargadas`);
            
            return this.transacciones;
            
        } catch (error) {
            console.error('❌ Error cargando transacciones históricas:', error);
            return [];
        }
    }

    // Calcular cuánto dinero tenía la escudería el lunes al inicio
    async calcularPresupuestoInicialSemana() {
        try {
            // Buscar el lunes anterior
            const lunesAnterior = new Date(this.semanaInicio);
            lunesAnterior.setDate(lunesAnterior.getDate() - 7);
            
            // Obtener el saldo más cercano al lunes (transacción anterior al lunes)
            const { data: transaccionesAntesLunes, error } = await this.supabase
                .from('transacciones')
                .select('saldo_resultante, fecha')
                .eq('escuderia_id', this.escuderia.id)
                .lt('fecha', this.semanaInicio.toISOString())
                .order('fecha', { ascending: false })
                .limit(1);

            if (error) throw error;
            
            if (transaccionesAntesLunes && transaccionesAntesLunes.length > 0) {
                // Si hay transacciones antes del lunes, usar el último saldo
                return transaccionesAntesLunes[0].saldo_resultante;
            } else {
                // Si no hay transacciones, usar el dinero inicial de la escudería
                const { data: escuderiaData } = await this.supabase
                    .from('escuderias')
                    .select('dinero')
                    .eq('id', this.escuderia.id)
                    .single();
                
                return escuderiaData ? escuderiaData.dinero : 5000000; // Valor por defecto
            }
            
        } catch (error) {
            console.error('❌ Error calculando presupuesto inicial:', error);
            return this.escuderia.dinero || 5000000;
        }
    }

    // Registrar transacción automáticamente cuando ocurre algo en el juego
    async registrarTransaccionAutomatica(tipo, cantidad, descripcion, categoria = null, referencia = null) {
        try {
            if (!this.escuderia || !this.escuderia.id) {
                console.error('❌ No hay escudería para registrar transacción');
                return false;
            }
            
            // Obtener el saldo actual de la escudería
            const { data: escuderiaActual, error: errorEscuderia } = await this.supabase
                .from('escuderias')
                .select('dinero')
                .eq('id', this.escuderia.id)
                .single();
                
            if (errorEscuderia) {
                console.error('❌ Error obteniendo saldo actual:', errorEscuderia);
                return false;
            }
            
            const saldoActual = escuderiaActual.dinero;
            const nuevoSaldo = tipo === 'ingreso' ? 
                saldoActual + cantidad : 
                saldoActual - cantidad;
            
            // Crear la transacción
            const transaccion = {
                escuderia_id: this.escuderia.id,
                tipo: tipo,
                cantidad: cantidad,
                descripcion: descripcion,
                categoria: categoria,
                referencia: referencia,
                fecha: new Date().toISOString(),
                saldo_resultante: nuevoSaldo
            };
    
            // Insertar en la base de datos
            const { error } = await this.supabase
                .from('transacciones')
                .insert([transaccion]);
    
            if (error) throw error;
            
            // Actualizar el dinero de la escudería
            const { error: errorUpdate } = await this.supabase
                .from('escuderias')
                .update({ dinero: nuevoSaldo })
                .eq('id', this.escuderia.id);
                
            if (errorUpdate) throw errorUpdate;
            
            // Actualizar lista local
            transaccion.saldo_resultante = nuevoSaldo;
            this.transacciones.unshift(transaccion);
            
            console.log(`✅ Transacción registrada: ${tipo} ${cantidad}€ - ${descripcion} (${categoria})`);
            console.log(`💰 Saldo actualizado: ${saldoActual}€ → ${nuevoSaldo}€`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error registrando transacción automática:', error);
            return false;
        }
    }

    // Método para registrar gastos de fabricación
    async registrarGastoFabricacion(piezaId, costo, area, nivel) {
        return await this.registrarTransaccionAutomatica(
            'gasto',
            costo,
            `Fabricación ${area} Nivel ${nivel}`,
            'produccion',
            { tipo: 'fabricacion', pieza_id: piezaId }
        );
    }

    // Método para registrar compras/ventas en el mercado
    async registrarTransaccionMercado(tipo, cantidad, descripcion, piezaId = null) {
        return await this.registrarTransaccionAutomatica(
            tipo,
            cantidad,
            descripcion,
            'mercado',
            { tipo: 'mercado', pieza_id: piezaId }
        );
    }

    // Método para registrar sueldos de ingenieros
    async registrarGastoSueldo(ingenieroId, nombre, salario) {
        return await this.registrarTransaccionAutomatica(
            'gasto',
            salario,
            `Sueldo ${nombre}`,
            'sueldos',
            { tipo: 'sueldo', ingeniero_id: ingenieroId }
        );
    }

    // Método para registrar ingresos por apuestas
    async registrarIngresoApuesta(cantidad, granPremioId) {
        return await this.registrarTransaccionAutomatica(
            'ingreso',
            cantidad,
            `Premio apuesta GP ${granPremioId}`,
            'apuestas',
            { tipo: 'apuesta', gp_id: granPremioId }
        );
    }

    // Método para consultar transacciones de esta semana
    async obtenerTransaccionesSemanaActual() {
        try {
            const { data, error } = await this.supabase
                .from('transacciones')
                .select('*')
                .eq('escuderia_id', this.escuderia.id)
                .gte('fecha', this.semanaInicio.toISOString())
                .order('fecha', { ascending: false });

            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('❌ Error obteniendo transacciones semanales:', error);
            return [];
        }
    }

    // Generar el HTML completo del presupuesto
    async generarHTMLPresupuesto() {
        try {
            // Obtener datos reales
            const transaccionesSemana = await this.obtenerTransaccionesSemanaActual();
            const presupuestoInicial = await this.calcularPresupuestoInicialSemana();
            const saldoActual = this.escuderia.dinero || 0;
            
            // Calcular resumen semanal
            const resumenSemanal = this.calcularResumenSemanal(transaccionesSemana);
            
            return `
                <div class="presupuesto-container compacto">
                    <!-- Encabezado compacto -->
                    <div class="presupuesto-header compacto">
                        <h2><i class="fas fa-coins"></i> PRESUPUESTO SEMANAL</h2>
                        <div class="semana-info">
                            Semana del ${this.formatFecha(this.semanaInicio)} al ${this.formatFecha(new Date())}
                        </div>
                    </div>
                    
                    <!-- RESUMEN SEMANAL COMPACTO -->
                    <div class="resumen-semanal">
                        <div class="resumen-header">
                            <h3><i class="fas fa-chart-pie"></i> RESUMEN SEMANAL</h3>
                            <div class="saldo-total ${saldoActual >= 0 ? 'positivo' : 'negativo'}">
                                ${Number(saldoActual).toLocaleString('es-ES', {minimumFractionDigits: 2})}€
                            </div>
                        </div>
                        
                        <div class="resumen-grid">
                            <!-- Presupuesto inicial (REAL) -->
                            <div class="resumen-item">
                                <div class="resumen-label">Presupuesto Inicial (Lunes)</div>
                                <div class="resumen-valor">${Number(presupuestoInicial).toLocaleString('es-ES', {minimumFractionDigits: 2})}€</div>
                            </div>
                            
                            <!-- Ingresos -->
                            <div class="resumen-item positivo">
                                <div class="resumen-label">Ingresos Totales</div>
                                <div class="resumen-valor">+${Number(resumenSemanal.ingresosTotales).toLocaleString('es-ES', {minimumFractionDigits: 2})}€</div>
                            </div>
                            
                            <!-- Gastos por categoría -->
                            <div class="resumen-item negativo">
                                <div class="resumen-label">Gastos Producción</div>
                                <div class="resumen-valor">-${Number(resumenSemanal.gastosProduccion).toLocaleString('es-ES', {minimumFractionDigits: 2})}€</div>
                            </div>
                            
                            <div class="resumen-item negativo">
                                <div class="resumen-label">Gastos Mercado</div>
                                <div class="resumen-valor">-${Number(resumenSemanal.gastosMercado).toLocaleString('es-ES', {minimumFractionDigits: 2})}€</div>
                            </div>
                            
                            <div class="resumen-item negativo">
                                <div class="resumen-label">Sueldos Estrategas</div>
                                <div class="resumen-valor">-${Number(resumenSemanal.gastosSueldos).toLocaleString('es-ES', {minimumFractionDigits: 2})}€</div>
                            </div>
                            
                            <div class="resumen-item negativo">
                                <div class="resumen-label">Otros Gastos</div>
                                <div class="resumen-valor">-${Number(resumenSemanal.gastosOtros).toLocaleString('es-ES', {minimumFractionDigits: 2})}€</div>
                            </div>
                            
                            <!-- Balance semanal -->
                            <div class="resumen-item balance">
                                <div class="resumen-label">BALANCE SEMANAL</div>
                                <div class="resumen-valor ${resumenSemanal.balanceSemanal >= 0 ? 'positivo' : 'negativo'}">
                                    ${resumenSemanal.balanceSemanal >= 0 ? '+' : ''}${Number(resumenSemanal.balanceSemanal).toLocaleString('es-ES', {minimumFractionDigits: 2})}€
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- TRANSACCIONES DETALLADAS -->
                    <div class="transacciones-detalladas">
                        <div class="transacciones-header">
                            <h3><i class="fas fa-list"></i> MOVIMIENTOS DIARIOS</h3>
                            <span class="contador">${transaccionesSemana.length} operaciones</span>
                        </div>
                        
                        ${transaccionesSemana.length === 0 ? 
                            `<div class="sin-transacciones compacto">
                                <p>📭 No hay movimientos esta semana</p>
                            </div>` : 
                            `<div class="transacciones-lista compacto">
                                ${transaccionesSemana.map(trans => this.generarHTMLTransaccionCompacta(trans)).join('')}
                            </div>`
                        }
                    </div>
                </div>
                
                <style>
                    /* ESTILOS COMPACTOS */
                    .presupuesto-container.compacto {
                        padding: 10px;
                        color: white;
                        max-width: 800px;
                        margin: 0 auto;
                        font-size: 0.9rem;
                    }
                    
                    .presupuesto-header.compacto {
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid rgba(0, 210, 190, 0.2);
                    }
                    
                    .presupuesto-header.compacto h2 {
                        font-family: 'Orbitron', sans-serif;
                        font-size: 1.2rem;
                        color: white;
                        margin-bottom: 5px;
                    }
                    
                    .semana-info {
                        color: #aaa;
                        font-size: 0.8rem;
                    }
                    
                    /* RESUMEN SEMANAL */
                    .resumen-semanal {
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 6px;
                        padding: 12px;
                        margin-bottom: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }
                    
                    .resumen-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 12px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    
                    .resumen-header h3 {
                        font-family: 'Orbitron', sans-serif;
                        font-size: 0.95rem;
                        color: white;
                    }
                    
                    .saldo-total {
                        font-family: 'Orbitron', sans-serif;
                        font-size: 1.1rem;
                        font-weight: bold;
                    }
                    
                    .resumen-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: 8px;
                    }
                    
                    .resumen-item {
                        padding: 8px 10px;
                        background: rgba(255, 255, 255, 0.02);
                        border-radius: 4px;
                        border-left: 3px solid;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .resumen-item.balance {
                        background: rgba(0, 210, 190, 0.1);
                        border-left-color: #00d2be;
                        grid-column: 1 / -1;
                        margin-top: 5px;
                    }
                    
                    .resumen-label {
                        color: #ddd;
                        font-size: 0.8rem;
                    }
                    
                    .resumen-valor {
                        font-family: 'Orbitron', sans-serif;
                        font-weight: bold;
                        font-size: 0.9rem;
                    }
                    
                    /* TRANSACCIONES DETALLADAS */
                    .transacciones-detalladas {
                        background: rgba(255, 255, 255, 0.02);
                        border-radius: 6px;
                        padding: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }
                    
                    .transacciones-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    }
                    
                    .transacciones-header h3 {
                        font-family: 'Orbitron', sans-serif;
                        font-size: 0.95rem;
                        color: white;
                    }
                    
                    .contador {
                        background: rgba(0, 210, 190, 0.2);
                        padding: 2px 8px;
                        border-radius: 10px;
                        font-size: 0.75rem;
                    }
                    
                    /* LISTA COMPACTA DE TRANSACCIONES */
                    .transacciones-lista.compacto {
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                    }
                    
                    .transaccion-item.compacto {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 10px;
                        background: rgba(255, 255, 255, 0.02);
                        border-radius: 4px;
                        border-left: 3px solid;
                        font-size: 0.85rem;
                        margin: 1px 0;
                    }
                    
                    .transaccion-compacta.ingreso {
                        border-left-color: #4CAF50;
                    }
                    
                    .transaccion-compacta.gasto {
                        border-left-color: #F44336;
                    }
                    
                    .transaccion-info.compacto {
                        flex: 1;
                        min-width: 0;
                    }
                    
                    .transaccion-descripcion.compacto {
                        font-weight: normal;
                        color: white;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        margin-bottom: 2px;
                    }
                    
                    .transaccion-meta.compacto {
                        display: flex;
                        gap: 10px;
                        font-size: 0.75rem;
                        color: #aaa;
                    }
                    
                    .transaccion-categoria {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 1px 6px;
                        border-radius: 3px;
                    }
                    
                    .transaccion-monto.compacto {
                        font-family: 'Orbitron', sans-serif;
                        font-weight: bold;
                        font-size: 0.9rem;
                        white-space: nowrap;
                        margin-left: 10px;
                    }
                    
                    .sin-transacciones.compacto {
                        text-align: center;
                        padding: 20px 10px;
                        color: #888;
                        font-size: 0.9rem;
                    }
                    
                    /* COLORES */
                    .positivo { color: #4CAF50; }
                    .negativo { color: #F44336; }
                    
                    /* RESPONSIVE */
                    @media (max-width: 768px) {
                        .resumen-grid {
                            grid-template-columns: 1fr;
                        }
                        
                        .transaccion-item.compacto {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 5px;
                        }
                        
                        .transaccion-monto.compacto {
                            margin-left: 0;
                            align-self: flex-end;
                        }
                        
                        .transaccion-meta.compacto {
                            flex-wrap: wrap;
                            gap: 5px;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .presupuesto-container.compacto {
                            padding: 8px;
                            font-size: 0.85rem;
                        }
                        
                        .resumen-item {
                            padding: 6px 8px;
                        }
                    }
                </style>
            `;
            
        } catch (error) {
            console.error('❌ Error generando HTML de presupuesto:', error);
            return '<div class="error">Error cargando datos del presupuesto</div>';
        }
    }

    generarHTMLTransaccionCompacta(transaccion) {
        const fecha = new Date(transaccion.fecha);
        const hora = fecha.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const dia = fecha.toLocaleDateString('es-ES', { 
            weekday: 'short',
            day: 'numeric'
        }).replace(/^\w/, c => c.toUpperCase());
        
        const esIngreso = transaccion.tipo === 'ingreso';
        const signo = esIngreso ? '+' : '-';
        const claseTipo = esIngreso ? 'ingreso' : 'gasto';
        const categoria = transaccion.categoria || 'otros';
        const nombreCategoria = this.categorias[categoria] || categoria;
        
        // Icono según categoría
        let icono = 'fa-receipt';
        if (categoria === 'produccion') icono = 'fa-industry';
        else if (categoria === 'mercado') icono = 'fa-shopping-cart';
        else if (categoria === 'sueldos') icono = 'fa-user-tie';
        else if (categoria === 'ingresos') icono = 'fa-money-bill-wave';
        else if (categoria === 'apuestas') icono = 'fa-dice';
        
        return `
            <div class="transaccion-item compacto transaccion-compacta ${claseTipo}">
                <div class="transaccion-info compacto">
                    <div class="transaccion-descripcion compacto">
                        <i class="fas ${icono} fa-xs" style="margin-right: 6px; opacity: 0.7;"></i>
                        ${transaccion.descripcion}
                    </div>
                    <div class="transaccion-meta compacto">
                        <span class="transaccion-fecha">${dia} ${hora}</span>
                        <span class="transaccion-categoria">${nombreCategoria}</span>
                    </div>
                </div>
                <div class="transaccion-monto compacto ${esIngreso ? 'positivo' : 'negativo'}">
                    ${signo}${Math.abs(Number(transaccion.cantidad)).toLocaleString('es-ES', {minimumFractionDigits: 2})}€
                </div>
            </div>
        `;
    }

    calcularResumenSemanal(transaccionesSemana) {
        // Inicializar valores
        let gastosProduccion = 0;
        let gastosMercado = 0;
        let gastosSueldos = 0;
        let gastosApuestas = 0;
        let ingresosTotales = 0;
        let gastosOtros = 0;
        
        // Calcular por cada transacción
        transaccionesSemana.forEach(transaccion => {
            const cantidad = Number(transaccion.cantidad);
            
            if (transaccion.tipo === 'ingreso') {
                ingresosTotales += cantidad;
            } else { // gasto
                switch (transaccion.categoria) {
                    case 'produccion':
                        gastosProduccion += cantidad;
                        break;
                    case 'mercado':
                        gastosMercado += cantidad;
                        break;
                    case 'sueldos':
                        gastosSueldos += cantidad;
                        break;
                    case 'apuestas':
                        gastosApuestas += cantidad;
                        break;
                    default:
                        gastosOtros += cantidad;
                        break;
                }
            }
        });
        
        const gastosTotales = gastosProduccion + gastosMercado + gastosSueldos + gastosApuestas + gastosOtros;
        const balanceSemanal = ingresosTotales - gastosTotales;
        
        return {
            gastosProduccion,
            gastosMercado,
            gastosSueldos,
            gastosApuestas,
            gastosOtros: gastosOtros + gastosApuestas, // Combinar apuestas con otros
            ingresosTotales,
            gastosTotales,
            balanceSemanal
        };
    }

    formatFecha(fecha) {
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Método para actualizar automáticamente cuando ocurren cosas en el juego
    async monitorearActividad() {
        // Esta función se puede llamar periódicamente para detectar cambios
        console.log('🔍 Monitoreando actividad financiera...');
        
        // Aquí puedes agregar lógica para detectar:
        // 1. Nuevas fabricaciones en fabricacion_actual
        // 2. Compras/ventas en almacen_piezas
        // 3. Sueldos en ingenieros_contratados
        // 4. Apuestas ganadas en apuestas
        
        // Por ahora solo recargamos las transacciones
        await this.cargarTransaccionesCompletas();
    }
}

// Inicialización global
window.PresupuestoManager = PresupuestoManager;
if (!window.presupuestoManager) {
    window.presupuestoManager = new PresupuestoManager();
    console.log('💰 PresupuestoManager REAL creado globalmente');
}

// Función para integrar con el sistema existente
async function integrarSistemaPresupuesto() {
    if (window.f1Manager && window.f1Manager.escuderia) {
        await window.presupuestoManager.inicializar(window.f1Manager.escuderia);
        console.log('✅ Sistema de presupuesto integrado con f1Manager');
    }
}

// Ejecutar integración cuando esté listo
if (document.readyState === 'complete') {
    setTimeout(integrarSistemaPresupuesto, 1000);
} else {
    window.addEventListener('load', () => {
        setTimeout(integrarSistemaPresupuesto, 1000);
    });
}
