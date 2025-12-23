// ========================
// DB-SYNC.JS - Sincronizar nombres de columnas
// ========================

class DBSync {
    static async checkAndFixTables() {
        console.log('🔍 Verificando estructura de tablas...');
        
        try {
            // Verificar columnas de fabricacion_actual
            const { data: fabColumns } = await supabase
                .from('fabricacion_actual')
                .select('*')
                .limit(1);

            if (fabColumns && fabColumns[0]) {
                const hasCreadaEn = 'creada_en' in fabColumns[0];
                const hasTiempoInicio = 'tiempo_inicio' in fabColumns[0];
                
                console.log('📊 fabricacion_actual:', {
                    tiene_creada_en: hasCreadaEn,
                    tiene_tiempo_inicio: hasTiempoInicio
                });
            }

            // Verificar columnas de piezas_almacen
            const { data: almacenColumns } = await supabase
                .from('piezas_almacen')
                .select('*')
                .limit(1);

            if (almacenColumns && almacenColumns[0]) {
                const hasFabricadaEn = 'fabricada_en' in almacenColumns[0];
                
                console.log('📦 piezas_almacen:', {
                    tiene_fabricada_en: hasFabricadaEn
                });
            }

        } catch (error) {
            console.error('❌ Error verificando tablas:', error);
        }
    }

    static async createMissingTables() {
        console.log('🗄️ Creando tablas faltantes...');
        
        // Esta función debe ejecutarse desde el SQL Editor de Supabase
        console.log('⚠️ Ejecuta el siguiente SQL en Supabase:');
        
        const sql = `
        -- 1. Asegurar que existe la tabla piezas_almacen con columna fabricada_en
        ALTER TABLE piezas_almacen 
        ADD COLUMN IF NOT EXISTS fabricada_en timestamp without time zone;
        
        -- 2. Asegurar que existe fabricacion_actual con creada_en
        ALTER TABLE fabricacion_actual 
        ADD COLUMN IF NOT EXISTS creada_en timestamp with time zone DEFAULT now();
        
        -- 3. Crear tabla users si no existe
        CREATE TABLE IF NOT EXISTS users (
            id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
            username TEXT NOT NULL,
            email TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT now(),
            last_login TIMESTAMP
        );
        
        -- 4. Habilitar RLS
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        -- 5. Crear políticas
        CREATE POLICY "Users can view own data" ON users
            FOR SELECT USING (auth.uid() = id);
        
        CREATE POLICY "Users can update own data" ON users
            FOR UPDATE USING (auth.uid() = id);
        `;
        
        console.log(sql);
    }
}

// Ejecutar cuando Supabase esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase) {
        setTimeout(() => DBSync.checkAndFixTables(), 2000);
    }
});
