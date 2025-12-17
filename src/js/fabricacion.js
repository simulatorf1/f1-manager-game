// ========================
// SISTEMA DE FABRICACIÓN COMPLETO
// ========================
console.log('🔧 Sistema de fabricación cargado');

class FabricacionManager {
    constructor() {
        this.currentProduction = null;
        this.productionTimer = null;
        this.productionUpdateInterval = null;
        this.init();
    }
    
    init() {
        console.log('🏭 Inicializando sistema de fabricación...');
        
        // Verificar producción en curso
        this.checkCurrentProduction();
        
        // Configurar eventos globales
        this.setupGlobalEvents();
    }
    
    setupGlobalEvents() {
        // Botón recoger pieza (en dashboard)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-recoger-pieza' || 
                e.target.closest('#btn-recoger-pieza')) {
                this.collectPiece();
            }
        });
    }
    
    async checkCurrentProduction() {
        try {
            if (!window.f1Manager?.escuderia?.id) {
                console.log('⏳ Esperando escudería para verificar producción...');
                return;
            }
            
            const { data: production, error } = await supabase
                .from('fabricacion_actual')
                .select('*')
                .eq('escuderia_id', window.f1Manager.escuderia.id)
                .eq('completada', false)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            if (production) {
                this.currentProduction = production;
                console.log('📦 Producción en curso encontrada:', production);
                this.startProductionTimer();
                this.updateProductionUI();
            }
            
        } catch (error) {
            console.error('❌ Error verificando producción:', error);
        }
    }
    
    async startFabrication(areaId, nivel = 1) {
        console.log(`🏭 Iniciando fabricación: ${areaId} Nivel ${nivel}`);
        
        if (!window.f1Manager?.escuderia) {
            window.f1Manager?.showNotification('❌ No tienes escudería', 'error');
            return false;
        }
        
        // Verificar si ya hay producción en curso
        if (this.currentProduction) {
            window.f1Manager?.showNotification('❌ Ya hay una pieza en fabricación', 'error');
            return false;
        }
        
        // Verificar fondos
        if (window.f1Manager.escuderia.dinero < CONFIG.PIECE_COST) {
            window.f1Manager?.showNotification('❌ Fondos insuficientes', 'error');
            return false;
        }
        
        // Verificar nivel máximo
        const areaName = CAR_AREAS.find(a => a.id === areaId)?.name || areaId;
        const carStats = await this.getCarStats();
        const currentLevel = carStats?.[`${areaId}_nivel`] || 0;
        
        if (currentLevel >= CONFIG.MAX_LEVEL) {
            window.f1Manager?.showNotification(`❌ ${areaName} ya está al nivel máximo`, 'error');
            return false;
        }
        
        try {
            // Calcular tiempos
            const inicio = new Date();
            const fin = new Date(inicio.getTime() + CONFIG.FABRICATION_TIME);
            
            // Crear registro en base de datos
            const { data: production, error } = await supabase
                .from('fabricacion_actual')
                .insert([
                    {
                        escuderia_id: window.f1Manager.escuderia.id,
                        area: areaId,
                        nivel: nivel,
                        inicio_fabricacion: inicio.toISOString(),
                        fin_fabricacion: fin.toISOString(),
                        completada: false,
                        costo: CONFIG.PIECE_COST
                    }
                ])
                .select()
                .single();
            
            if (error) throw error;
            
            // Descontar dinero
            window.f1Manager.escuderia.dinero -= CONFIG.PIECE_COST;
            await window.f1Manager.updateEscuderiaMoney();
            
            // Actualizar estado local
            this.currentProduction = production;
            
            // Iniciar timer
            this.startProductionTimer();
            
            // Actualizar UI
            this.updateProductionUI();
            
            // Mostrar notificación
            window.f1Manager?.showNotification(
                `🏭 Fabricación de ${areaName} Nivel ${nivel} iniciada (4 horas)`,
                'success'
            );
            
            return true;
            
        } catch (error) {
            console.error('❌ Error iniciando fabricación:', error);
            window.f1Manager?.showNotification('❌ Error al iniciar fabricación', 'error');
            return false;
        }
    }
    
    startProductionTimer() {
        if (!this.currentProduction) return;
        
        // Limpiar timer anterior
        if (this.productionUpdateInterval) {
            clearInterval(this.productionUpdateInterval);
        }
        
        // Actualizar inmediatamente
        this.updateProductionProgress();
        
        // Actualizar cada segundo
        this.productionUpdateInterval = setInterval(() => {
            this.updateProductionProgress();
        }, 1000);
    }
    
    updateProductionProgress() {
        if (!this.currentProduction) return;
        
        const now = new Date();
        const endTime = new Date(this.currentProduction.fin_fabricacion);
        const startTime = new Date(this.currentProduction.inicio_fabricacion);
        
        // Calcular tiempo transcurrido y restante
        const elapsed = now - startTime;
        const remaining = endTime - now;
        const totalTime = CONFIG.FABRICATION_TIME;
        
        // Calcular porcentaje
        let progress = Math.min(100, (elapsed / totalTime) * 100);
        
        // Actualizar UI
        this.updateProductionUI(progress, remaining);
        
        // Si se completó
        if (remaining <= 0) {
            this.completeProduction();
        }
    }
    
    updateProductionUI(progress = 0, remaining = 0) {
        // Actualizar en dashboard
        const progressBar = document.getElementById('production-progress');
        const timeLeft = document.getElementById('time-left');
        const collectBtn = document.getElementById('btn-recoger-pieza');
        const statusEl = document.getElementById('factory-status');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (timeLeft) {
            if (remaining <= 0) {
                timeLeft.textContent = '¡Listo para recoger!';
                if (collectBtn) collectBtn.disabled = false;
            } else {
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                timeLeft.textContent = `Tiempo restante: ${hours}h ${minutes}m ${seconds}s`;
                if (collectBtn) collectBtn.disabled = true;
            }
        }
        
        if (statusEl && this.currentProduction) {
            const area = CAR_AREAS.find(a => a.id === this.currentProduction.area);
            const areaName = area ? area.name : this.currentProduction.area;
            statusEl.innerHTML = `
                <p><i class="fas fa-industry"></i> Fabricando: 
                <strong>${areaName} Nivel ${this.currentProduction.nivel}</strong></p>
            `;
        }
        
        // Actualizar en taller si está visible
        if (window.tabManager?.currentTab === 'taller') {
            this.updateTallerUI();
        }
    }
    
    updateTallerUI() {
        // Actualizar todas las áreas en el taller
        CAR_AREAS.forEach(area => {
            const progressBar = document.getElementById(`progress-${area.id}`);
            if (progressBar) {
                const fill = progressBar.querySelector('.progress-fill');
                // Aquí obtendrías el progreso real de la base de datos
                // Por ahora mostramos 0%
                if (fill) fill.style.width = '0%';
            }
        });
    }
    
    async completeProduction() {
        if (!this.currentProduction) return;
        
        console.log('🎉 Producción completada:', this.currentProduction);
        
        // Limpiar timer
        if (this.productionUpdateInterval) {
            clearInterval(this.productionUpdateInterval);
            this.productionUpdateInterval = null;
        }
        
        // Actualizar UI para mostrar completado
        this.updateProductionUI(100, 0);
        
        // Mostrar notificación
        const area = CAR_AREAS.find(a => a.id === this.currentProduction.area);
        const areaName = area ? area.name : this.currentProduction.area;
        
        window.f1Manager?.showNotification(
            `✅ ${areaName} Nivel ${this.currentProduction.nivel} lista para recoger!`,
            'success'
        );
