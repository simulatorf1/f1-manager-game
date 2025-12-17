// ============================================
// IMPORTAR CONFIGURACIÓN
// ============================================
import {
    supabase,
    CONFIG,
    AREAS_COCHE,
    formatCurrency,
    formatTime,
    formatDate,
    capitalize
} from './config.js';

// ============================================
// CLASE PRINCIPAL F1 MANAGER
// ============================================
class F1Manager {
    constructor() {
        // Estado del juego
        this.user = null;
        this.escuderia = null;
        this.cocheStats = null;
        this.pilotos = [];
        this.piezasAlmacen = [];
        this.fabricacionActual = null;
        this.gpActual = null;
        this.calendario = [];
        
        // Timers
        this.timers = {
            fabricacion: null,
            countdown: null,
            dataRefresh: null
        };
        
        // Estado UI
        this.isLoading = true;
        
        // Inicializar
        this.init();
    }
    
    // ============================================
    // INICIALIZACIÓN
    // ============================================
    async init() {
        console.log('🚀 Iniciando F1 Manager E-Strategy...');
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Mostrar loading screen
        this.showLoadingScreen();
        
        // Verificar autenticación
        await this.checkAuth();
        
        // Cargar datos iniciales
        await this.loadInitialData();
        
        // Iniciar timers
        this.startTimers();
        
        // Ocultar loading screen
        this.hideLoadingScreen();
        
        console.log('✅ Juego inicializado correctamente');
    }
    
    // ============================================
    // AUTHENTICACIÓN
    // ============================================
    async checkAuth() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) {
                console.error('Error de autenticación:', error);
                this.redirectToLogin();
                return;
            }
            
            if (!user) {
                this.redirectToLogin();
                return;
            }
            
            this.user = user;
            console.log('👤 Usuario autenticado:', user.email);
            
            // Actualizar UI con nombre de usuario
            const username = user.email.split('@')[0];
            document.getElementById('username').textContent = capitalize(username);
            
        } catch (error) {
            console.error('Error en checkAuth:', error);
            this.redirectToLogin();
        }
    }
    
    redirectToLogin() {
        // En un entorno real, redirigirías a la página de login
        console.log('🔒 Redirigiendo a login...');
        alert('Por favor, inicia sesión para continuar');
        // window.location.href = '/login.html';
    }
    
    // ============================================
    // CARGA DE DATOS
    // ============================================
    async loadInitialData() {
        try {
            // Cargar datos en paralelo
            await Promise.all([
                this.loadEscuderia(),
                this.loadPilotos(),
                this.loadCocheStats(),
                this.loadFabricacionActual(),
                this.loadCalendario(),
                this.loadPiezasAlmacen()
            ]);
            
            // Actualizar UI
            this.updateUI();
            
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showError('Error al cargar datos del juego');
        }
    }
    
    async loadEscuderia() {
        try {
            const { data: escuderias, error } = await supabase
                .from('escuderias')
                .select('*')
                .eq('user_id', this.user.id)
                .single();
            
            if (error) {
                // Si no existe escudería, crear una
                if (error.code === 'PGRST116') {
                    await this.createDefaultEscuderia();
                    return this.loadEscuderia(); // Recargar
                }
                throw error;
            }
            
            this.escuderia = escuderias;
            console.log('🏎️ Escudería cargada:', this.escuderia.nombre);
            
        } catch (error) {
            console.error('Error cargando escudería:', error);
            throw error;
        }
    }
    
    async createDefaultEscuderia() {
        const nombreEscuderia = `Escudería ${this.user.email.split('@')[0]}`;
        
        const { data, error } = await supabase
            .from('escuderias')
            .insert([
                {
                    user_id: this.user.id,
                    nombre: nombreEscuderia,
                    dinero: CONFIG.ESTADO_INICIAL.dinero,
                    puntos: CONFIG.ESTADO_INICIAL.puntos,
                    nivel_ingenieria: CONFIG.ESTADO_INICIAL.nivel_ingenieria
                }
            ])
            .select()
            .single();
            
        if (error) {
            console.error('Error creando escudería:', error);
            throw error;
        }
        
        console.log('✅ Escudería creada:', nombreEscuderia);
        return data;
    }
    
    async loadPilotos() {
        try {
            const { data: pilotos, error } = await supabase
                .from('pilotos_contratados')
                .select('*')
                .eq('escuderia_id', this.escuderia.id)
                .eq('activo', true);
            
            if (error) throw error;
            
            this.pilotos = pilotos || [];
            console.log(`👥 ${this.pilotos.length} pilotos cargados`);
            
        } catch (error) {
            console.error('Error cargando pilotos:', error);
            this.pilotos = [];
        }
    }
    
    async loadCocheStats() {
        try {
            const { data: stats, error } = await supabase
                .from('coches_stats')
                .select('*')
                .eq('escuderia_id', this.escuderia.id)
                .single();
            
            if (error) {
                // Si no existe, crear estadísticas por defecto
                if (error.code === 'PGRST116') {
                    await this.createDefaultCocheStats();
                    return this.loadCocheStats(); // Recargar
                }
                throw error;
            }
            
            this.cocheStats = stats;
            console.log('📊 Estadísticas del coche cargadas');
            
        } catch (error) {
            console.error('Error cargando estadísticas del coche:', error);
            throw error;
        }
    }
    
    async createDefaultCocheStats() {
        const stats = {
            escuderia_id: this.escuderia.id,
            suelo_nivel: 0,
            motor_nivel: 0,
            aleron_delantero_nivel: 0,
            caja_cambios_nivel: 0,
            pontones_nivel: 0,
            suspension_nivel: 0,
            aleron_trasero_nivel: 0,
            chasis_nivel: 0,
            frenos_nivel: 0,
            volante_nivel: 0,
            electronica_nivel: 0,
            suelo_progreso: 0,
            motor_progreso: 0,
            aleron_delantero_progreso: 0,
            caja_cambios_progreso: 0,
            pontones_progreso: 0,
            suspension_progreso: 0,
            aleron_trasero_progreso: 0,
            chasis_progreso: 0,
            frenos_progreso: 0,
            volante_progreso: 0,
            electronica_progreso: 0
        };
        
        const { error } = await supabase
            .from('coches_stats')
            .insert([stats]);
            
        if (error) {
            console.error('Error creando estadísticas del coche:', error);
            throw error;
        }
        
        console.log('✅ Estadísticas del coche creadas');
    }
    
    async loadFabricacionActual() {
        try {
            const { data: fabricacion, error } = await supabase
                .from('fabricacion_actual')
                .select('*')
                .eq('escuderia_id', this.escuderia.id)
                .eq('completada', false)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            this.fabricacionActual = fabricacion || null;
            
            if (this.fabricacionActual) {
                console.log('🏭 Fabricación en curso cargada');
                this.startFabricacionTimer();
            }
            
        } catch (error) {
            console.error('Error cargando fabricación actual:', error);
            this.fabricacionActual = null;
        }
    }
    
    async loadCalendario() {
        try {
            const { data: calendario, error } = await supabase
                .from('calendario_gp')
                .select('*')
                .order('fecha_inicio', { ascending: true });
            
            if (error) throw error;
            
            this.calendario = calendario || [];
            
            // Encontrar GP actual (próximo no cerrado)
            const ahora = new Date();
            this.gpActual = this.calendario.find(gp => 
                new Date(gp.fecha_inicio) > ahora && !gp.cerrado_apuestas
            ) || this.calendario[0];
            
            console.log(`📅 ${this.calendario.length} carreras cargadas`);
            
        } catch (error) {
            console.error('Error cargando calendario:', error);
            this.calendario = [];
            this.gpActual = null;
        }
    }
    
    async loadPiezasAlmacen() {
        try {
            const { data: piezas, error } = await supabase
                .from('piezas_almacen')
                .select('*')
                .eq('escuderia_id', this.escuderia.id)
                .eq('estado', 'disponible');
            
            if (error) throw error;
            
            this.piezasAlmacen = piezas || [];
            
            // Mostrar alerta si hay piezas nuevas
            if (this.piezasAlmacen.length > 0) {
                this.showAlertaAlmacen();
            }
            
            console.log(`📦 ${this.piezasAlmacen.length} piezas en almacén`);
            
        } catch (error) {
            console.error('Error cargando piezas del almacén:', error);
            this.piezasAlmacen = [];
        }
    }
    
    // ============================================
    // ACTUALIZACIÓN DE UI
    // ============================================
    updateUI() {
        if (!this.escuderia) return;
        
        // Actualizar header
        this.updateHeader();
        
        // Actualizar pilotos
        this.renderPilotos();
        
        // Actualizar estado del coche
        this.renderCocheStats();
        
        // Actualizar calendario
        this.renderCalendario();
        
        // Actualizar estadísticas
        this.updateStats();
        
        // Actualizar countdown
        this.updateCountdown();
        
        // Actualizar fabricación
        this.updateFabricacionUI();
    }
    
    updateHeader() {
        document.getElementById('escuderia-nombre').textContent = this.escuderia.nombre;
        document.getElementById('saldo').textContent = formatCurrency(this.escuderia.dinero);
        document.getElementById('puntos').textContent = this.escuderia.puntos;
        document.getElementById('ranking').textContent = this.escuderia.ranking || '-';
        
        // Actualizar tag del equipo
        const teamTag = document.getElementById('team-tag');
        teamTag.textContent = `#${this.escuderia.nombre.replace(/\s+/g, '').toUpperCase()}`;
    }
    
    renderPilotos() {
        const container = document.getElementById('pilotos-container');
        
        if (!this.pilotos || this.pilotos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <p>No tienes pilotos contratados</p>
                    <button class="btn-small" id="contratar-primer-piloto">
                        <i class="fas fa-plus"></i> Contratar Primer Piloto
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.pilotos.map(piloto => `
            <div class="piloto-card" data-piloto-id="${piloto.id}">
                <div class="piloto-header">
                    <div class="piloto-name">
                        <h3>${piloto.nombre}</h3>
                        <div class="piloto-nacionalidad">
                            <i class="fas fa-flag"></i>
                            <span>Nacionalidad</span>
                        </div>
                    </div>
                    <div class="piloto-salary">
                        <span class="salary-label">Salario</span>
                        <span class="salary-value">${formatCurrency(piloto.salario)}/año</span>
                    </div>
                </div>
                
                <div class="piloto-stats">
                    <div class="piloto-stat">
                        <span class="stat-value">${piloto.habilidad || 80}</span>
                        <span class="stat-label">Habilidad</span>
                    </div>
                    <div class="piloto-stat">
                        <span class="stat-value">${piloto.experiencia || 5}</span>
                        <span class="stat-label">Experiencia</span>
                    </div>
                    <div class="piloto-stat">
                        <span class="stat-value">${piloto.carreras_ganadas || 0}</span>
                        <span class="stat-label">Victorias</span>
                    </div>
                </div>
                
                <div class="piloto-contract">
                    <div class="contract-progress">
                        <span class="contract-label">Contrato restante</span>
                        <span class="carreras-restantes">${piloto.carreras_restantes} carreras</span>
                    </div>
                    <div class="progress-bar-small">
                        <div class="progress-fill-small" 
                             style="width: ${(piloto.carreras_restantes / 21) * 100}%"></div>
                    </div>
                </div>
                
                <div class="piloto-actions">
                    <button class="btn-small" onclick="f1Manager.renovarContrato('${piloto.id}')">
                        <i class="fas fa-file-signature"></i> Renovar
                    </button>
                    <button class="btn-small btn-danger" onclick="f1Manager.despidoPiloto('${piloto.id}')">
                        <i class="fas fa-user-times"></i> Despedir
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    renderCocheStats() {
        if (!this.cocheStats) return;
        
        const container = document.getElementById('areas-coche');
        let mejorArea = { nombre: 'Ninguna', nivel: -1 };
        let peorArea = { nombre: 'Ninguna', nivel: 11 };
        
        container.innerHTML = AREAS_COCHE.map(area => {
            const nivel = this.cocheStats[`${area.key}_nivel`] || 0;
            const progreso = this.cocheStats[`${area.key}_progreso`] || 0;
            const porcentaje = (progreso / CONFIG.PIEZAS_POR_NIVEL) * 100;
            
            // Actualizar mejor/peor área
            if (nivel > mejorArea.nivel) {
                mejorArea = { nombre: area.nombre, nivel };
            }
            if (nivel < peorArea.nivel) {
                peorArea = { nombre: area.nombre, nivel };
            }
            
            return `
                <div class="area-item" data-area="${area.key}">
                    <div class="area-icon">
                        <i class="${area.icon}" style="color: ${area.color}"></i>
                    </div>
                    <span class="area-nombre">${area.nombre}</span>
                    <div class="area-nivel">
                        <span>Nivel</span>
                        <span class="nivel-valor">${nivel}</span>
                    </div>
                    <div class="area-progreso">
                        <span>Progreso:</span>
                        <span class="progreso-valor">${progreso}/${CONFIG.PIEZAS_POR_NIVEL}</span>
                    </div>
                    <div class="progress-bar-small">
                        <div class="progress-fill-small" style="width: ${porcentaje}%"></div>
                    </div>
                    <button class="btn-fabricar" onclick="f1Manager.iniciarFabricacion('${area.key}')">
                        <i class="fas fa-hammer"></i> Fabricar
                    </button>
                </div>
            `;
        }).join('');
        
        // Actualizar mejor/peor área
        document.getElementById('mejor-area').textContent = mejorArea.nombre;
        document.getElementById('peor-area').textContent = peorArea.nombre;
    }
    
    renderCalendario() {
        if (!this.calendario || this.calendario.length === 0) return;
        
        const container = document.getElementById('calendar-list');
        const proximasCarreras = this.calendario.slice(0, 3); // Mostrar solo 3
        
        container.innerHTML = proximasCarreras.map(gp => `
            <div class="calendar-item">
                <h4>${gp.nombre}</h4>
                <div class="calendar-date">
                    <i class="far fa-calendar"></i>
                    <span>${formatDate(gp.fecha_inicio)} - ${formatDate(gp.fecha_fin)}</span>
                </div>
                <div class="calendar-circuit">
                    <i class="fas fa-road"></i>
                    <span>${gp.circuito}</span>
                </div>
            </div>
        `).join('');
        
        // Actualizar GP actual
        if (this.gpActual) {
            document.getElementById('gp-nombre').textContent = this.gpActual.nombre.toUpperCase();
            document.getElementById('gp-fecha').textContent = 
                `${formatDate(this.gpActual.fecha_inicio)} - ${formatDate(this.gpActual.fecha_fin)}`;
            document.getElementById('gp-circuito').textContent = this.gpActual.circuito;
        }
    }
    
    updateStats() {
        // Aquí actualizarías estadísticas como:
        // document.getElementById('mejor-acierto').textContent = '85%';
        // document.getElementById('ingresos-totales').textContent = formatCurrency(2500000);
        // etc.
    }
    
    updateCountdown() {
        if (!this.gpActual) return;
        
        // Suponer que las apuestas cierran 1 día antes de la carrera
        const cierreApuestas = new Date(this.gpActual.fecha_inicio);
        cierreApuestas.setDate(cierreApuestas.getDate() - 1);
        cierreApuestas.setHours(23, 59, 0, 0);
        
        this.startCountdownTimer(cierreApuestas);
    }
    
    updateFabricacionUI() {
        if (!this.fabricacionActual) {
            document.getElementById('pieza-actual').textContent = 'NINGUNA EN PRODUCCIÓN';
            document.getElementById('pieza-nivel').textContent = '-';
            document.getElementById('progreso-fabricacion').style.width = '0%';
            document.getElementById('tiempo-restante-texto').textContent = '-';
            document.getElementById('btn-recoger-pieza').disabled = true;
            return;
        }
        
        const area = AREAS_COCHE.find(a => a.key === this.fabricacionActual.area);
        document.getElementById('pieza-actual').textContent = area ? area.nombre.toUpperCase() : this.fabricacionActual.area.toUpperCase();
        document.getElementById('pieza-nivel').textContent = `NIVEL ${this.fabricacionActual.nivel}`;
        
        // El timer actualizará el progreso automáticamente
    }
    
    // ============================================
    // FABRICACIÓN
    // ============================================
    async iniciarFabricacion(area) {
        if (this.fabricacionActual) {
            this.showNotification('Ya hay una pieza en fabricación', 'warning');
            return;
        }
        
        // Verificar saldo
        const costo = CONFIG.PRECIO_BASE_PIEZA;
        if (this.escuderia.dinero < costo) {
            this.showNotification('Fondos insuficientes', 'error');
            return;
        }
        
        // Obtener nivel actual
        const nivelActual = this.cocheStats[`${area}_nivel`] || 0;
        if (nivelActual >= CONFIG.NIVEL_MAXIMO) {
            this.showNotification('Esta área ya está al máximo nivel', 'warning');
            return;
        }
        
        // Calcular tiempos
        const inicio = new Date();
        const fin = new Date(inicio.getTime() + CONFIG.TIEMPO_FABRICACION);
        
        try {
            const { data: fabricacion, error } = await supabase
                .from('fabricacion_actual')
                .insert([
                    {
                        escuderia_id: this.escuderia.id,
                        area: area,
                        nivel: nivelActual + 1,
                        inicio_fabricacion: inicio.toISOString(),
                        fin_fabricacion: fin.toISOString(),
                        completada: false,
                        costo: costo
                    }
                ])
                .select()
                .single();
            
            if (error) throw error;
            
            // Descontar dinero
            await this.actualizarDinero(-costo);
            
            this.fabricacionActual = fabricacion;
            this.startFabricacionTimer();
            
            this.showNotification('¡Fabricación iniciada!', 'success');
            
        } catch (error) {
            console.error('Error iniciando fabricación:', error);
            this.showNotification('Error al iniciar fabricación', 'error');
        }
    }
    
    startFabricacionTimer() {
        if (!this.fabricacionActual) return;
        
        const updateTimer = () => {
            const ahora = new Date();
            const finFabricacion = new Date(this.fabricacionActual.fin_fabricacion);
            const tiempoRestante = finFabricacion - ahora;
            
            if (tiempoRestante <= 0) {
                // Fabricación completada
                clearInterval(this.timers.fabricacion);
                this.completarFabricacion();
                return;
            }
            
            // Calcular porcentaje
            const tiempoTotal = CONFIG.TIEMPO_FABRICACION;
            const tiempoTranscurrido = tiempoTotal - tiempoRestante;
            const porcentaje = Math.min(100, (tiempoTranscurrido / tiempoTotal) * 100);
            
            // Actualizar UI
            document.getElementById('progreso-fabricacion').style.width = `${porcentaje}%`;
            document.getElementById('tiempo-restante-texto').textContent = formatTime(tiempoRestante);
            document.getElementById('btn-recoger-pieza').disabled = true;
        };
        
        // Actualizar inmediatamente
        updateTimer();
        
        // Actualizar cada segundo
        this.timers.fabricacion = setInterval(updateTimer, 1000);
    }
    
    async completarFabricacion() {
        try {
            // Marcar como completada
            await supabase
                .from('fabricacion_actual')
                .update({ completada: true })
                .eq('id', this.fabricacionActual.id);
            
            // Crear pieza en almacén
            const { error } = await supabase
                .from('piezas_almacen')
                .insert([
                    {
                        escuderia_id: this.escuderia.id,
                        area: this.fabricacionActual.area,
                        nivel: this.fabricacionActual.nivel,
                        estado: 'disponible',
                        puntos_base: CONFIG.PUNTOS_POR_PIEZA
                    }
                ]);
            
            if (error) throw error;
            
            // Actualizar progreso del área
            await this.actualizarProgresoArea(this.fabricacionActual.area);
            
            // Limpiar fabricación actual
            this.fabricacionActual = null;
            
            // Recargar almacén
            await this.loadPiezasAlmacen();
            
            // Actualizar UI
            this.updateFabricacionUI();
            document.getElementById('btn-recoger-pieza').disabled = false;
            
            this.showNotification('¡Pieza fabricada! Revisa tu almacén.', 'success');
            
        } catch (error) {
            console.error('Error completando fabricación:', error);
            this.showNotification('Error al completar fabricación', 'error');
        }
    }
    
    async actualizarProgresoArea(area) {
        try {
            const progresoActual = this.cocheStats[`${area}_progreso`] || 0;
            const nuevoProgreso = progresoActual + 1;
            
            // Si se completan las 20 piezas, subir de nivel
            if (nuevoProgreso >= CONFIG.PIEZAS_POR_NIVEL) {
                const nivelActual = this.cocheStats[`${area}_nivel`] || 0;
                
                await supabase
                    .from('coches_stats')
                    .update({
                        [`${area}_progreso`]: 0,
                        [`${area}_nivel`]: nivelActual + 1
                    })
                    .eq('escuderia_id', this.escuderia.id);
                
                this.showNotification(`¡${capitalize(area)} ha subido al nivel ${nivelActual + 1}!`, 'success');
                
            } else {
                await supabase
                    .from('coches_stats')
                    .update({ [`${area}_progreso`]: nuevoProgreso })
                    .eq('escuderia_id', this.escuderia.id);
            }
            
            // Recargar estadísticas
            await this.loadCocheStats();
            
        } catch (error) {
            console.error('Error actualizando progreso:', error);
        }
    }
    
    // ============================================
    // TIMERS
    // ============================================
    startTimers() {
        // Timer para actualizar datos periódicamente
        this.timers.dataRefresh = setInterval(() => {
            this.loadInitialData();
        }, CONFIG.ACTUALIZACION_DATOS);
        
        console.log('⏱️ Timers iniciados');
    }
    
    startCountdownTimer(targetDate) {
        const updateCountdown = () => {
            const ahora = new Date();
            const diferencia = targetDate - ahora;
            
            if (diferencia <= 0) {
                clearInterval(this.timers.countdown);
                document.getElementById('countdown-hours').textContent = '00';
                document.getElementById('countdown-minutes').textContent = '00';
                document.getElementById('countdown-seconds').textContent = '00';
                return;
            }
            
            const horas = Math.floor(diferencia / (1000 * 60 * 60));
            const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
            
            document.getElementById('countdown-hours').textContent = horas.toString().padStart(2, '0');
            document.getElementById('countdown-minutes').textContent = minutos.toString().padStart(2, '0');
            document.getElementById('countdown-seconds').textContent = segundos.toString().padStart(2, '0');
        };
        
        // Actualizar inmediatamente
        updateCountdown();
        
        // Actualizar cada segundo
        this.timers.countdown = setInterval(updateCountdown, 1000);
    }
    
    // ============================================
    // NOTIFICACIONES Y UI
    // ============================================
    showLoadingScreen() {
        this.isLoading = true;
        // La pantalla de loading ya está en el HTML
    }
    
    hideLoadingScreen() {
        this.isLoading = false;
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('app').style.display = 'block';
        }, 500);
    }
    
    showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Añadir al body
        document.body.appendChild(notification);
        
        // Mostrar con animación
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Eliminar después de 5 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showAlertaAlmacen() {
        const alerta = document.getElementById('alerta-almacen');
        const count = this.piezasAlmacen.length;
        
        alerta.querySelector('span').textContent = `${count} pieza${count !== 1 ? 's' : ''} nueva${count !== 1 ? 's' : ''}`;
        alerta.style.display = 'flex';
        
        // Parpadeo
        alerta.style.animation = 'pulse 2s infinite';
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        // Botón recoger pieza
        document.getElementById('btn-recoger-pieza').addEventListener('click', () => {
            this.completarFabricacion();
        });
        
        // Botón iniciar fabricación
        document.getElementById('btn-iniciar-fab').addEventListener('click', () => {
            this.showModalFabricacion();
        });
        
        // Botón apostar
        document.getElementById('btn-apostar').addEventListener('click', () => {
            this.showModalApuestas();
        });
        
        // User menu
        const userBtn = document.getElementById('user-btn');
        const userDropdown = document.getElementById('user-dropdown');
        
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', () => {
            userDropdown.classList.remove('show');
        });
        
        // Logout
        document.querySelector('[href="#"]').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }
    
    showModalFabricacion() {
        const modal = document.getElementById('modal-fabricacion');
        const content = modal.querySelector('.modal-content');
        
        content.innerHTML = `
            <h2><i class="fas fa-industry"></i> FABRICAR NUEVA PIEZA</h2>
            <div class="modal-body">
                <p>Selecciona el área que quieres mejorar:</p>
                <div class="areas-grid">
                    ${AREAS_COCHE.map(area => {
                        const nivel = this.cocheStats[`${area.key}_nivel`] || 0;
                        const progreso = this.cocheStats[`${area.key}_progreso`] || 0;
                        const puedeFabricar = nivel < CONFIG.NIVEL_MAXIMO;
                        
                        return `
                            <div class="area-option ${!puedeFabricar ? 'disabled' : ''}" 
                                 data-area="${area.key}">
                                <div class="area-option-icon">
                                    <i class="${area.icon}"></i>
                                </div>
                                <div class="area-option-info">
                                    <h4>${area.nombre}</h4>
                                    <p>Nivel ${nivel} • ${progreso}/20 piezas</p>
                                    <p class="area-cost">Costo: ${formatCurrency(CONFIG.PRECIO_BASE_PIEZA)}</p>
                                </div>
                                ${puedeFabricar ? 
                                    '<button class="btn-small select-area">Seleccionar</button>' : 
                                    '<span class="tag max-level">Máximo</span>'
                                }
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="selected-area" id="selected-area" style="display: none;">
                    <h3>Área seleccionada: <span id="selected-area-name"></span></h3>
                    <p>Tiempo de fabricación: 4 horas</p>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" id="cancelar-fab">Cancelar</button>
                <button class="btn-primary" id="confirmar-fab" disabled>Fabricar</button>
            </div>
        `;
        
        modal.classList.add('show');
        
        // Configurar eventos del modal
        let selectedArea = null;
        
        // Seleccionar área
        modal.querySelectorAll('.select-area').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const areaOption = e.target.closest('.area-option');
                selectedArea = areaOption.dataset.area;
                
                // Remover selección anterior
                modal.querySelectorAll('.area-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Marcar como seleccionada
                areaOption.classList.add('selected');
                
                // Mostrar detalles
                const areaName = AREAS_COCHE.find(a => a.key === selectedArea).nombre;
                document.getElementById('selected-area').style.display = 'block';
                document.getElementById('selected-area-name').textContent = areaName;
                
                // Habilitar botón de fabricar
                document.getElementById('confirmar-fab').disabled = false;
            });
        });
        
        // Confirmar fabricación
        document.getElementById('confirmar-fab').addEventListener('click', () => {
            if (selectedArea) {
                this.iniciarFabricacion(selectedArea);
                modal.classList.remove('show');
            }
        });
        
        // Cancelar
        document.getElementById('cancelar-fab').addEventListener('click', () => {
            modal.classList.remove('show');
        });
        
        // Cerrar al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
    
    showModalApuestas() {
        this.showNotification('Sistema de apuestas en desarrollo', 'info');
    }
    
    // ============================================
    // FUNCIONES DE ECONOMÍA
    // ============================================
    async actualizarDinero(cambio) {
        const nuevoSaldo = this.escuderia.dinero + cambio;
        
        try {
            const { error } = await supabase
                .from('escuderias')
                .update({ dinero: nuevoSaldo })
                .eq('id', this.escuderia.id);
            
            if (error) throw error;
            
            this.escuderia.dinero = nuevoSaldo;
            this.updateHeader();
            
        } catch (error) {
            console.error('Error actualizando dinero:', error);
            throw error;
        }
    }
    
    // ============================================
    // FUNCIONES DE PILOTOS
    // ============================================
    async contratarPiloto(pilotoId) {
        // Implementar lógica de contratación
        this.showNotification('Sistema de contratación en desarrollo', 'info');
    }
    
    async renovarContrato(pilotoId) {
        this.showNotification('Sistema de renovación en desarrollo', 'info');
    }
    
    async despedirPiloto(pilotoId) {
        if (!confirm('¿Estás seguro de despedir a este piloto?')) return;
        
        this.showNotification('Sistema de despido en desarrollo', 'info');
    }
    
    // ============================================
    // LOGOUT
    // ============================================
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            window.location.reload();
            
        } catch (error) {
            console.error('Error en logout:', error);
        }
    }
    
    // ============================================
    // FUNCIONES PÚBLICAS (para acceso desde HTML)
    // ============================================
    iniciarFabricacion(area) {
        this.iniciarFabricacion(area);
    }
}

// ============================================
// INICIALIZAR APLICACIÓN
// ============================================
// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia global
    window.f1Manager = new F1Manager();
    
    console.log('🎮 F1 Manager E-Strategy listo!');
});

// Exportar para uso en otros archivos
export default F1Manager;
