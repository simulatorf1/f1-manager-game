// ============================================
// SISTEMA DE PESTAÑAS
// ============================================

class TabManager {
    constructor() {
        this.currentTab = 'principal';
        this.init();
    }
    
    init() {
        this.setupTabButtons();
        this.setupTabContent();
        this.switchTab('principal');
    }
    
    setupTabButtons() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }
    
    setupTabContent() {
        // Crear contenido inicial para cada pestaña
        this.initializeTabContent();
    }
    
    async switchTab(tabId) {
        // Actualizar botones activos
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        // Ocultar todo el contenido
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Mostrar contenido de la pestaña seleccionada
        const tabContent = document.getElementById(`tab-${tabId}`);
        if (tabContent) {
            tabContent.classList.add('active');
            this.currentTab = tabId;
            
            // Cargar contenido específico de la pestaña
            await this.loadTabContent(tabId);
        }
    }
    
    initializeTabContent() {
        // Contenido para la pestaña de Taller
        const tabTaller = document.getElementById('tab-taller');
        if (tabTaller) {
            tabTaller.innerHTML = `
                <div class="taller-header">
                    <h2><i class="fas fa-tools"></i> TALLER DE DISEÑO</h2>
                    <p class="taller-description">
                        Diseña y fabrica piezas para mejorar tu coche. Cada pieza tarda 4 horas en fabricarse.
                    </p>
                </div>
                
                <div class="taller-stats">
                    <div class="stat-card-taller">
                        <i class="fas fa-clock"></i>
                        <div>
                            <span class="stat-label">TIEMPO DE FABRICACIÓN</span>
                            <span class="stat-value">4 horas</span>
                        </div>
                    </div>
                    <div class="stat-card-taller">
                        <i class="fas fa-coins"></i>
                        <div>
                            <span class="stat-label">COSTE POR PIEZA</span>
                            <span class="stat-value">€10,000</span>
                        </div>
                    </div>
                    <div class="stat-card-taller">
                        <i class="fas fa-puzzle-piece"></i>
                        <div>
                            <span class="stat-label">PIEZAS POR NIVEL</span>
                            <span class="stat-value">20</span>
                        </div>
                    </div>
                </div>
                
                <div class="taller-areas" id="taller-areas">
                    <!-- Las áreas se cargarán dinámicamente -->
                </div>
                
                <div class="taller-history">
                    <h3><i class="fas fa-history"></i> HISTORIAL DE FABRICACIÓN</h3>
                    <div class="history-list" id="history-list">
                        <!-- Historial cargado dinámicamente -->
                    </div>
                </div>
            `;
        }
        
        // Contenido para la pestaña de Almacén
        const tabAlmacen = document.getElementById('tab-almacen');
        if (tabAlmacen) {
            tabAlmacen.innerHTML = `
                <div class="almacen-header">
                    <h2><i class="fas fa-warehouse"></i> ALMACÉN DE PIEZAS</h2>
                    <div class="almacen-filters">
                        <button class="btn-filter active" data-filter="all">Todas</button>
                        <button class="btn-filter" data-filter="available">Disponibles</button>
                        <button class="btn-filter" data-filter="equipped">Equipadas</button>
                    </div>
                </div>
                
                <div class="almacen-stats">
                    <div class="stat-card-almacen">
                        <span class="stat-number" id="total-piezas">0</span>
                        <span class="stat-label">Piezas totales</span>
                    </div>
                    <div class="stat-card-almacen">
                        <span class="stat-number" id="piezas-disponibles">0</span>
                        <span class="stat-label">Disponibles</span>
                    </div>
                    <div class="stat-card-almacen">
                        <span class="stat-number" id="piezas-equipadas">0</span>
                        <span class="stat-label">Equipadas</span>
                    </div>
                    <div class="stat-card-almacen">
                        <span class="stat-number" id="valor-total">€0</span>
                        <span class="stat-label">Valor total</span>
                    </div>
                </div>
                
                <div class="almacen-grid" id="almacen-grid">
                    <!-- Piezas cargadas dinámicamente -->
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>No hay piezas en el almacén</p>
                        <button class="btn-primary" onclick="window.f1Manager.iniciarFabricacion('motor')">
                            <i class="fas fa-industry"></i> Fabricar primera pieza
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Contenido para la pestaña de Mercado
        const tabMercado = document.getElementById('tab-mercado');
        if (tabMercado) {
            tabMercado.innerHTML = `
                <div class="mercado-header">
                    <h2><i class="fas fa-shopping-cart"></i> MERCADO DE PIEZAS</h2>
                    <div class="mercado-actions">
                        <button class="btn-secondary" id="btn-vender-pieza">
                            <i class="fas fa-tag"></i> Vender Pieza
                        </button>
                        <button class="btn-secondary" id="btn-refresh-mercado">
                            <i class="fas fa-sync-alt"></i> Actualizar
                        </button>
                    </div>
                </div>
                
                <div class="mercado-filters">
                    <div class="filter-group">
                        <label for="filter-area">Área:</label>
                        <select id="filter-area" class="filter-select">
                            <option value="all">Todas las áreas</option>
                            <!-- Opciones cargadas dinámicamente -->
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="filter-nivel">Nivel:</label>
                        <select id="filter-nivel" class="filter-select">
                            <option value="all">Todos los niveles</option>
                            <!-- Opciones cargadas dinámicamente -->
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="filter-precio">Precio:</label>
                        <select id="filter-precio" class="filter-select">
                            <option value="asc">Menor a mayor</option>
                            <option value="desc">Mayor a menor</option>
                        </select>
                    </div>
                </div>
                
                <div class="mercado-grid" id="mercado-grid">
                    <div class="empty-state">
                        <i class="fas fa-store-slash"></i>
                        <p>No hay piezas en el mercado</p>
                        <p class="empty-subtitle">Sé el primero en vender una pieza</p>
                    </div>
                </div>
                
                <div class="mercado-info">
                    <h3><i class="fas fa-info-circle"></i> INFORMACIÓN DEL MERCADO</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <i class="fas fa-percentage"></i>
                            <div>
                                <span class="info-label">Comisión de venta</span>
                                <span class="info-value">20% sobre el precio de costo</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-shield-alt"></i>
                            <div>
                                <span class="info-label">Protección anti-espía</span>
                                <span class="info-value">€50,000 por transacción</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-exchange-alt"></i>
                            <div>
                                <span class="info-label">Política de devolución</span>
                                <span class="info-value">No hay devoluciones</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Contenido para la pestaña de Presupuesto
        const tabPresupuesto = document.getElementById('tab-presupuesto');
        if (tabPresupuesto) {
            tabPresupuesto.innerHTML = `
                <div class="presupuesto-header">
                    <h2><i class="fas fa-chart-pie"></i> PRESUPUESTO Y FINANZAS</h2>
                    <div class="period-selector">
                        <select id="periodo-presupuesto" class="period-select">
                            <option value="mensual">Mensual</option>
                            <option value="anual" selected>Anual</option>
                            <option value="total">Total</option>
                        </select>
                    </div>
                </div>
                
                <div class="presupuesto-resumen">
                    <div class="resumen-card ingresos">
                        <h3><i class="fas fa-arrow-down"></i> INGRESOS</h3>
                        <div class="resumen-content" id="ingresos-detalle">
                            <!-- Cargado dinámicamente -->
                        </div>
                        <div class="resumen-total">
                            <span>Total ingresos:</span>
                            <strong id="total-ingresos">€0</strong>
                        </div>
                    </div>
                    
                    <div class="resumen-card gastos">
                        <h3><i class="fas fa-arrow-up"></i> GASTOS</h3>
                        <div class="resumen-content" id="gastos-detalle">
                            <!-- Cargado dinámicamente -->
                        </div>
                        <div class="resumen-total">
                            <span>Total gastos:</span>
                            <strong id="total-gastos">€0</strong>
                        </div>
                    </div>
                    
                    <div class="resumen-card balance">
                        <h3><i class="fas fa-scale-balanced"></i> BALANCE</h3>
                        <div class="balance-content">
                            <div class="balance-item">
                                <span>Saldo inicial:</span>
                                <span id="saldo-inicial">€5,000,000</span>
                            </div>
                            <div class="balance-item">
                                <span>Ingresos - Gastos:</span>
                                <span id="diferencia">€0</span>
                            </div>
                            <div class="balance-item total">
                                <span>Saldo final:</span>
                                <strong id="saldo-final">€5,000,000</strong>
                            </div>
                        </div>
                        <div class="balance-status" id="balance-status">
                            <i class="fas fa-check-circle"></i>
                            <span>Presupuesto saludable</span>
                        </div>
                    </div>
                </div>
                
                <div class="presupuesto-grafico">
                    <h3><i class="fas fa-chart-line"></i> EVOLUCIÓN FINANCIERA</h3>
                    <div class="grafico-container">
                        <canvas id="grafico-finanzas"></canvas>
                    </div>
                </div>
                
                <div class="presupuesto-consejos">
                    <h3><i class="fas fa-lightbulb"></i> CONSEJOS FINANCIEROS</h3>
                    <div class="consejos-grid">
                        <div class="consejo-item">
                            <i class="fas fa-hand-holding-usd"></i>
                            <h4>Controla los gastos</h4>
                            <p>Los salarios de pilotos son tu mayor gasto fijo.</p>
                        </div>
                        <div class="consejo-item">
                            <i class="fas fa-industry"></i>
                            <h4>Invierte en desarrollo</h4>
                            <p>Cada pieza fabricada genera ingresos en carrera.</p>
                        </div>
                        <div class="consejo-item">
                            <i class="fas fa-balance-scale"></i>
                            <h4>Mantén reservas</h4>
                            <p>Guarda al menos 1M€ para emergencias.</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Contenido para la pestaña de Clasificación
        const tabClasificacion = document.getElementById('tab-clasificacion');
        if (tabClasificacion) {
            tabClasificacion.innerHTML = `
                <div class="clasificacion-header">
                    <h2><i class="fas fa-medal"></i> CLASIFICACIÓN GLOBAL</h2>
                    <div class="clasificacion-filters">
                        <button class="btn-filter active" data-filter="global">Global</button>
                        <button class="btn-filter" data-filter="friends">Amigos</button>
                        <button class="btn-filter" data-filter="regional">Regional</button>
                    </div>
                </div>
                
                <div class="clasificacion-info">
                    <div class="info-card">
                        <i class="fas fa-trophy"></i>
                        <div>
                            <span class="info-label">Tu posición</span>
                            <span class="info-value" id="mi-posicion">#-</span>
                        </div>
                    </div>
                    <div class="info-card">
                        <i class="fas fa-users"></i>
                        <div>
                            <span class="info-label">Total jugadores</span>
                            <span class="info-value" id="total-jugadores">0</span>
                        </div>
                    </div>
                    <div class="info-card">
                        <i class="fas fa-flag-checkered"></i>
                        <div>
                            <span class="info-label">Puntos para Top 10</span>
                            <span class="info-value" id="puntos-top10">0</span>
                        </div>
                    </div>
                </div>
                
                <div class="clasificacion-tabla">
                    <table>
                        <thead>
                            <tr>
                                <th>Pos.</th>
                                <th>Escudería</th>
                                <th>Puntos</th>
                                <th>Dinero</th>
                                <th>Nivel Ing.</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-clasificacion">
                            <!-- Datos cargados dinámicamente -->
                            <tr>
                                <td colspan="6" class="empty-row">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <span>Cargando clasificación...</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="clasificacion-pagination">
                    <button class="btn-pagination prev" disabled>
                        <i class="fas fa-chevron-left"></i> Anterior
                    </button>
                    <span class="pagination-info">Página <span id="current-page">1</span> de <span id="total-pages">1</span></span>
                    <button class="btn-pagination next">
                        Siguiente <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="clasificacion-logros">
                    <h3><i class="fas fa-award"></i> TUS LOGROS</h3>
                    <div class="logros-grid" id="logros-grid">
                        <!-- Logros cargados dinámicamente -->
                    </div>
                </div>
            `;
        }
    }
    
    async loadTabContent(tabId) {
        switch(tabId) {
            case 'taller':
                await this.loadTallerContent();
                break;
                
            case 'almacen':
                await this.loadAlmacenContent();
                break;
                
            case 'mercado':
                await this.loadMercadoContent();
                break;
                
            case 'presupuesto':
                await this.loadPresupuestoContent();
                break;
                
            case 'clasificacion':
                await this.loadClasificacionContent();
                break;
        }
    }
    
    async loadTallerContent() {
        // Cargar áreas para el taller
        const areasContainer = document.getElementById('taller-areas');
        if (areasContainer && window.f1Manager && window.f1Manager.cocheStats) {
            // Similar a renderCocheStats pero con más detalles
        }
        
        // Cargar historial
        await this.loadFabricacionHistory();
    }
    
    async loadAlmacenContent() {
        if (!window.f1Manager) return;
        
        // Cargar piezas del almacén
        await window.f1Manager.loadPiezasAlmacen();
        
        const container = document.getElementById('almacen-grid');
        if (!container) return;
        
        const piezas = window.f1Manager.piezasAlmacen || [];
        
        if (piezas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>No hay piezas en el almacén</p>
                    <button class="btn-primary" onclick="window.f1Manager.iniciarFabricacion('motor')">
                        <i class="fas fa-industry"></i> Fabricar primera pieza
                    </button>
                </div>
            `;
            return;
        }
        
        // Actualizar estadísticas
        document.getElementById('total-piezas').textContent = piezas.length;
        document.getElementById('piezas-disponibles').textContent = 
            piezas.filter(p => p.estado === 'disponible').length;
        document.getElementById('piezas-equipadas').textContent = 
            piezas.filter(p => p.estado === 'equipada').length;
        
        // Calcular valor total
        const valorTotal = piezas.reduce((sum, pieza) => {
            return sum + (10000 * pieza.nivel); // Precio base × nivel
        }, 0);
        
        document.getElementById('valor-total').textContent = 
            new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0
            }).format(valorTotal);
        
        // Renderizar piezas
        container.innerHTML = piezas.map(pieza => {
            const area = window.f1Manager.AREAS_COCHE?.find(a => a.key === pieza.area) || 
                        { nombre: pieza.area, icon: 'fas fa-cog', color: '#666' };
            
            return `
                <div class="pieza-card" data-pieza-id="${pieza.id}">
                    <div class="pieza-header">
                        <div class="pieza-icon" style="color: ${area.color}">
                            <i class="${area.icon}"></i>
                        </div>
                        <div class="pieza-info">
                            <h4>${area.nombre}</h4>
                            <div class="pieza-meta">
                                <span class="pieza-nivel">Nivel ${pieza.nivel}</span>
                                <span class="pieza-fecha">
                                    ${new Date(pieza.fabricada_en).toLocaleDateString('es-ES')}
                                </span>
                            </div>
                        </div>
                        <span class="pieza-estado ${pieza.estado}">
                            ${pieza.estado === 'disponible' ? 'Disponible' : 
                              pieza.estado === 'equipada' ? 'Equipada' : 'Vendida'}
                        </span>
                    </div>
                    
                    <div class="pieza-stats">
                        <div class="pieza-stat">
                            <span class="stat-label">Puntos</span>
                            <span class="stat-value">+${pieza.puntos_base || 10}</span>
                        </div>
                        <div class="pieza-stat">
                            <span class="stat-label">Valor</span>
                            <span class="stat-value">€${(10000 * pieza.nivel).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="pieza-actions">
                        ${pieza.estado === 'disponible' ? `
                            <button class="btn-small btn-equipar" onclick="window.f1Manager.equiparPieza('${pieza.id}')">
                                <i class="fas fa-bolt"></i> Equipar
                            </button>
                            <button class="btn-small btn-vender" onclick="window.f1Manager.venderPieza('${pieza.id}')">
                                <i class="fas fa-tag"></i> Vender
                            </button>
                        ` : ''}
                        
                        ${pieza.estado === 'equipada' ? `
                            <button class="btn-small btn-desequipar" onclick="window.f1Manager.desequiparPieza('${pieza.id}')">
                                <i class="fas fa-minus-circle"></i> Desequipar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async loadMercadoContent() {
        // Implementar carga de mercado
        console.log('Cargando contenido del mercado...');
    }
    
    async loadPresupuestoContent() {
        // Implementar carga de presupuesto
        console.log('Cargando contenido del presupuesto...');
    }
    
    async loadClasificacionContent() {
        // Implementar carga de clasificación
        console.log('Cargando contenido de clasificación...');
    }
    
    async loadFabricacionHistory() {
        // Implementar carga de historial
        console.log('Cargando historial de fabricación...');
    }
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    window.tabManager = new TabManager();
});

// Para usar desde la consola o otros scripts
export default TabManager;
