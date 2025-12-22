// ========================
// INTEGRACION.JS - Conexión entre sistemas (VERSIÓN CORREGIDA)
// ========================

class IntegracionManager {
    constructor() {
        this.integrationTimers = {};
        this.ultimasNotificaciones = {}; // Para evitar notificaciones duplicadas
    }

    async inicializar(escuderiaId) {
        console.log('🔗 Inicializando integración entre sistemas (modo seguro)...');
        
        // 1. Sistema de notificaciones para piezas listas (cada 10 segundos)
        this.integrationTimers.notificaciones = setInterval(() => {
            this.verificarYNotificarPiezasListas();
        }, 10000);

        // 2. Sincronizar estadísticas del coche (cada 30 segundos)
        this.integrationTimers.stats = setInterval(() => {
            this.sincronizarEstadisticas();
        }, 30000);

        console.log('✅ Integración inicializada en modo seguro');
        return true;
    }

    async verificarYNotificarPiezasListas() {
        try {
            // Verificar SOLO fabricaciones completadas en los últimos 2 minutos
            const dosMinutosAtras = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            
            const { data: fabricacionesListas, error } = await supabase
                .from('fabricacion_actual')
                .select('*')
                .eq('completada', true)
                .gte('creada_en', dosMinutosAtras)  // ← SOLO recientes
                .order('creada_en', { ascending: false })
                .limit(3);

            if (error) {
                console.log('⚠️ Error en verificación:', error.message);
                return;
            }

            if (fabricacionesListas && fabricacionesListas.length > 0) {
                console.log(`🔔 ${fabricacionesListas.length} fabricación(es) recientemente completada(s)`);
                
                // Filtrar solo las que no hemos notificado recientemente
                const nuevas = fabricacionesListas.filter(fab => {
                    const key = `fab_${fab.id}`;
                    const yaNotificada = this.ultimasNotificaciones[key];
                    return !yaNotificada;
                });

                // Notificar cada nueva fabricación lista
                for (const fabricacion of nuevas) {
                    await this.notificarPiezaLista(fabricacion);
                    
                    // Marcar como notificada (por 5 minutos)
                    const key = `fab_${fabricacion.id}`;
                    this.ultimasNotificaciones[key] = true;
                    
                    // Limpiar después de 5 minutos
                    setTimeout(() => {
                        delete this.ultimasNotificaciones[key];
                    }, 300000);
                }
            }

        } catch (error) {
            console.error('❌ Error verificando piezas:', error);
        }
    }

    async notificarPiezaLista(fabricacion) {
        try {
            console.log(`📢 Notificando: ${fabricacion.area} está lista para recoger`);
            
            // 1. Mostrar notificación en pantalla
            if (window.f1Manager && window.f1Manager.showNotification) {
                window.f1Manager.showNotification(
                    `✅ ¡Pieza de ${fabricacion.area} lista! Ve a "Producción" para recogerla.`,
                    'success'
                );
            }

            // 2. Actualizar alerta en dashboard (si existe)
            const alerta = document.getElementById('alerta-almacen');
            if (alerta) {
                alerta.style.display = 'flex';
                alerta.innerHTML = `
                    <i class="fas fa-bell"></i>
                    <span>¡Pieza de ${fabricacion.area} lista para recoger!</span>
                `;
                
                // Ocultar después de 15 segundos
                setTimeout(() => {
                    if (alerta) alerta.style.display = 'none';
                }, 15000);
            }

            // 3. Forzar actualización del monitor de producción
            if (window.f1Manager && window.f1Manager.updateProductionMonitor) {
                setTimeout(() => {
                    window.f1Manager.updateProductionMonitor();
                }, 1000);
            }

        } catch (error) {
            console.error('❌ Error en notificación:', error);
        }
    }

    async sincronizarEstadisticas() {
        try {
            // Verificar si hay cambios en las estadísticas
            const { data: cambios, error } = await supabase
                .from('coches_stats')
                .select('*')
                .order('actualizado_en', { ascending: false })
                .limit(1);

            if (error) {
                console.log('⚠️ Error chequeando estadísticas:', error.message);
                return;
            }

            if (cambios && cambios.length > 0) {
                const ultimoCambio = new Date(cambios[0].actualizado_en);
                const ahora = new Date();
                const diferencia = ahora - ultimoCambio;

                // Si hay cambios recientes (últimos 45 segundos)
                if (diferencia < 45000) {
                    console.log('📊 Sincronizando estadísticas del coche...');
                    
                    // Actualizar en main.js si existe
                    if (window.f1Manager && window.f1Manager.loadCarStatus) {
                        // Pequeño delay para no saturar
                        setTimeout(() => {
                            window.f1Manager.loadCarStatus();
                        }, 2000);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error sincronizando estadísticas:', error);
        }
    }

    // Función auxiliar para actualizar el taller cuando sea necesario
    actualizarTallerSiEsNecesario() {
        // Solo actualizar si la pestaña del taller está activa
        if (window.tabManager && window.tabManager.currentTab === 'taller') {
            if (window.tabManager.loadTallerAreas) {
                setTimeout(() => {
                    window.tabManager.loadTallerAreas();
                }, 1500);
            }
        }
    }

    detener() {
        // Detener todos los timers de forma segura
        Object.keys(this.integrationTimers).forEach(key => {
            if (this.integrationTimers[key]) {
                clearInterval(this.integrationTimers[key]);
                console.log(`⏹️ Timer ${key} detenido`);
            }
        });
        this.integrationTimers = {};
        this.ultimasNotificaciones = {};
        console.log('🛑 Sistema de integración completamente detenido');
    }
}

// Inicializar globalmente
window.IntegracionManager = IntegracionManager;

// Inicializar cuando el DOM esté listo Y Supabase esté disponible
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Supabase esté listo
    const esperarSupabase = setInterval(() => {
        if (window.supabase && window.supabase.from) {
            clearInterval(esperarSupabase);
            window.integracionManager = new IntegracionManager();
            console.log('✅ IntegracionManager inicializado correctamente');
            
            // No llamamos a inicializar aquí, main.js lo hará cuando tenga la escudería
        }
    }, 100);
});

console.log('✅ Clase IntegracionManager registrada');
