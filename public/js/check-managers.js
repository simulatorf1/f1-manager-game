// Verificar managers
console.log('🔍 Verificando managers...');
console.log('FabricacionManager:', window.FabricacionManager ? '✅ Definido' : '❌ No definido');
console.log('fabricacionManager:', window.fabricacionManager ? '✅ Instanciado' : '❌ No instanciado');
console.log('AlmacenManager:', window.AlmacenManager ? '✅ Definido' : '❌ No definido');
console.log('almacenManager:', window.almacenManager ? '✅ Instanciado' : '❌ No instanciado');
console.log('IntegracionManager:', window.IntegracionManager ? '✅ Definido' : '❌ No definido');

// Función para forzar creación
window.forceCreateManagers = function(escuderiaId) {
    if (window.FabricacionManager && !window.fabricacionManager) {
        window.fabricacionManager = new window.FabricacionManager();
        if (escuderiaId) {
            window.fabricacionManager.inicializar(escuderiaId);
        }
        console.log('✅ fabricacionManager creado');
    }
    
    if (window.AlmacenManager && !window.almacenManager) {
        window.almacenManager = new window.AlmacenManager();
        if (escuderiaId) {
            window.almacenManager.inicializar(escuderiaId);
        }
        console.log('✅ almacenManager creado');
    }
};

// Ejecutar al cargar
setTimeout(() => {
    if (window.f1Manager && window.f1Manager.escuderia) {
        window.forceCreateManagers(window.f1Manager.escuderia.id);
    }
}, 3000);
