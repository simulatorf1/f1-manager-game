// ========================
// FABRICACION.JS - VERSIÓN DEFINITIVA
// ========================
console.log('🔧 Sistema de fabricación DEFINITIVO cargado');

class FabricacionManager {
    constructor() {
        this.escuderiaId = null;
        this.produccionesActivas = [];
        this.timers = {};
    }

    async inicializar(escuderiaId) {
        console.log('🔧 Inicializando fabricación para escudería:', escuderiaId);
        this.escuderiaId = escuderiaId;
        await this.cargarProduccionesActivas();
        return true;
    }
    actualizarUIProduccion(soloContador = false) {
        console.log('🔧 [FABRICACION] actualizarUIProduccion llamado');
        
        if (soloContador) {
            // Solo actualizar contador si es necesario
            return;
        }
        
        // Tu lógica para actualizar la UI de producción
        if (window.f1Manager && window.f1Manager.updateProductionMonitor) {
            window.f1Manager.updateProductionMonitor();
        }
    }
    async cargarProduccionesActivas() {
        try {
            const { data, error } = await supabase
                .from('fabricacion_actual')
                .select('*')
                .eq('escuderia_id', this.escuderiaId)
                .eq('completada', false)
                .order('tiempo_inicio', { ascending: true });

            if (error) throw error;

            this.produccionesActivas = data || [];
            console.log(`📊 ${this.produccionesActivas.length} producciones activas cargadas`);

            // Iniciar timers para cada producción
            this.produccionesActivas.forEach(prod => {
                this.iniciarTimerProduccion(prod.id);
            });

            return this.produccionesActivas;

        } catch (error) {
            console.error('❌ Error cargando producciones:', error);
            return [];
        }
    }

    iniciarTimerProduccion(produccionId) {
        if (this.timers[produccionId]) {
            clearInterval(this.timers[produccionId]);
        }
    
        this.timers[produccionId] = setInterval(() => {
            // 1. Primero verificar si terminó
            this.verificarProduccion(produccionId);
        
            // 2. Luego solo actualizar contador (NO toda la UI)
            this.actualizarUIProduccion(true); // true = solo contador
        }, 1000); // Cada 1 segundo para contador fluido
    }

    async verificarProduccion(produccionId) {
        try {
            const produccion = this.produccionesActivas.find(p => p.id === produccionId);
            if (!produccion) return;

            const ahora = new Date();
            const tiempoInicio = new Date(produccion.tiempo_inicio);
            const tiempoFin = new Date(produccion.tiempo_fin);
        
            const duracionTotal = tiempoFin - tiempoInicio;
            const tiempoTranscurrido = ahora - tiempoInicio;

            console.log('🔧 Verificación ajustada:', {
                horaFinBD: produccion.tiempo_fin,
                horaFinAjustada: tiempoFin.toISOString(),
                duracionTotal: duracionTotal/1000 + 's',
                tiempoTranscurrido: tiempoTranscurrido/1000 + 's',
                progreso: (tiempoTranscurrido/duracionTotal*100).toFixed(1) + '%'
            });
            
            if (tiempoTranscurrido >= duracionTotal) {
                console.log(`✅ Producción ${produccionId} LISTA para recoger`);
                
                clearInterval(this.timers[produccionId]);
                produccion.estado = 'lista_para_recoger';
                produccion.lista_para_recoger = true; // Bandera adicional
    
                // Cambiar a timer de actualización de UI solamente
                this.timers[produccionId] = setInterval(() => {
                    this.actualizarUIProduccion(true);
                }, 1000);
                // ⬆️ HASTA AQUÍ AÑADIR
                
                setTimeout(() => this.actualizarUIProduccion(), 1000);
            }

        } catch (error) {
            console.error('❌ Error verificando producción:', error);
        }
    }
    // Añade este método a la clase:
    async crearPiezaEnAlmacen(fabricacion) {
        try {
            // Tu lógica de conversión de área aquí...
            let areaId = 'motor'; // Simplificado
            
            const { error } = await supabase
                .from('piezas_almacen')
                .insert([{
                    escuderia_id: fabricacion.escuderia_id,
                    area: areaId,
                    nivel: fabricacion.nivel,
                    estado: 'disponible',
                    puntos_base: 10,
                    fabricada_en: new Date().toISOString()
                }]);
            
            if (!error) {
                console.log(`📦 Pieza creada en almacén automáticamente`);
                if (window.f1Manager?.showNotification) {
                    window.f1Manager.showNotification(`📦 Pieza de ${fabricacion.area} enviada al almacén`, 'success');
                }
            }
        } catch (error) {
            console.error('Error creando pieza:', error);
        }
    }

    async iniciarFabricacion(areaId) {
        console.log('🔨 Iniciando fabricación para área:', areaId);
        
        if (!this.escuderiaId) {
            console.error('❌ No hay escudería ID');
            return false;
        }
        try {
            // 1. Verificar límite de fabricaciones simultáneas (MÁXIMO 4)
            if (this.produccionesActivas.length >= 4) {
                alert('❌ Límite alcanzado: Máximo 4 fabricaciones simultáneas');
                return false;
            }
   
            // 1. Verificar fondos disponibles
            const costoFabricacion = 10000;
            
            const { data: escuderia, error: escError } = await supabase
                .from('escuderias')
                .select('dinero')
                .eq('id', this.escuderiaId)
                .single();
                
            if (escError) throw escError;
            
            if (escuderia.dinero < costoFabricacion) {
                alert(`❌ Fondos insuficientes. Necesitas €${costoFabricacion.toLocaleString()}, tienes €${escuderia.dinero.toLocaleString()}`);
                return false;
            }
            
            // 2. Descontar dinero
            const nuevoDinero = escuderia.dinero - costoFabricacion;
            const { error: updateError } = await supabase
                .from('escuderias')
                .update({ dinero: nuevoDinero })
                .eq('id', this.escuderiaId);
                
            if (updateError) throw updateError;
            
            // 3. Actualizar en main.js si está disponible
            if (window.f1Manager && window.f1Manager.escuderia) {
                window.f1Manager.escuderia.dinero = nuevoDinero;
                window.f1Manager.updateEscuderiaMoney();
            }
            
            console.log(`💰 Descontados €${costoFabricacion.toLocaleString()}. Nuevo saldo: €${nuevoDinero.toLocaleString()}`);
            
            // 4. Obtener información del área
            const area = window.CAR_AREAS.find(a => a.id === areaId);
            if (!area) {
                console.error('❌ Área no encontrada');
                return false;
            }

            // 5. Calcular tiempos
            const duracionSegundos = 120; // 2 minutos para pruebas
            const tiempoInicio = new Date();
            const tiempoFin = new Date(tiempoInicio.getTime() + (duracionSegundos * 1000));
            const tiempoFinAjustado = new Date(tiempoFin.getTime() + 3600000); // +1 hora
            
            // DEBUG CRÍTICO: Verificar diferencia horaria
            console.log('🕒 DEBUG HORAS:');
            console.log('Hora local (navegador):', tiempoInicio.toISOString());
            console.log('Hora fin calculada:', tiempoFin.toISOString());
            console.log('Diferencia con ahora:', (tiempoFin - tiempoInicio) / 1000, 'segundos');

            // 6. Crear nueva fabricación en BD
            const { data: nuevaFabricacion, error: insertError } = await supabase
                .from('fabricacion_actual')
                .insert([{
                    escuderia_id: this.escuderiaId,
                    area: area.name,
                    orden_pieza: await this.obtenerSiguienteOrden(areaId),
                    nombre_visible: await this.obtenerNombrePieza(areaId, await this.obtenerSiguienteOrden(areaId)),
                    tiempo_inicio: tiempoInicio.toISOString(),
                    tiempo_fin: tiempoFinAjustado.toISOString(),
                    completada: false,
                    costo: costoFabricacion,
                    creada_en: new Date().toISOString()
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            console.log('✅ Fabricación creada en BD:', nuevaFabricacion.id);

            // 7. VERIFICACIÓN CRÍTICA: Comparar horas
            console.log('🔍 VERIFICACIÓN CRÍTICA:');
            console.log('Hora inicio guardada:', nuevaFabricacion.tiempo_inicio);
            console.log('Hora fin guardada:', nuevaFabricacion.tiempo_fin);
            
            const inicioBD = new Date(nuevaFabricacion.tiempo_inicio);
            const finBD = new Date(nuevaFabricacion.tiempo_fin);
            const ahora = new Date();
            
            console.log('Diferencia inicioBD - ahora:', (inicioBD - ahora) / 1000, 'segundos');
            console.log('Diferencia finBD - ahora:', (finBD - ahora) / 1000, 'segundos');
            console.log('¿finBD > ahora?', finBD > ahora);

            // 8. Añadir a lista local CON LOS DATOS DE BD
            this.produccionesActivas.push(nuevaFabricacion);

            // 9. Iniciar timer
            this.iniciarTimerProduccion(nuevaFabricacion.id);

            // 10. Actualizar UI
            setTimeout(() => this.actualizarUIProduccion(), 100);

            // 11. Mostrar notificación
            if (window.f1Manager && window.f1Manager.showNotification) {
                window.f1Manager.showNotification(`🔨 Fabricación de ${area.name} iniciada (2 minutos)`, 'info');
            }
            
            return true;

        } catch (error) {
            console.error('❌ Error iniciando fabricación:', error);
            return false;
        }
    }
    async recogerPieza(fabricacionId) {
        try {
            // 1. Buscar la fabricación
            const fabricacion = this.produccionesActivas.find(f => f.id === fabricacionId);
            if (!fabricacion) {
                console.error('❌ Fabricación no encontrada');
                return false;
            }

            // 2. Convertir nombre del área al ID correcto
            let areaId = null;
            const areaConfig = window.CAR_AREAS.find(a => a.name === fabricacion.area);
            
            if (areaConfig) {
                areaId = areaConfig.id;
            } else {
                // Mapeo manual
                const mapeoEmergencia = {
                    'Suelo y Difusor': 'suelo',
                    'Motor': 'motor',
                    'Alerón Delantero': 'aleron_delantero',
                    'Caja de Cambios': 'caja_cambios',
                    'Pontones': 'pontones',
                    'Suspensión': 'suspension',
                    'Alerón Trasero': 'aleron_trasero',
                    'Chasis': 'chasis',
                    'Frenos': 'frenos',
                    'Volante': 'volante',
                    'Electrónica': 'electronica'
                };
                areaId = mapeoEmergencia[fabricacion.area] || 'motor';
            }

            // 3. Crear pieza en almacén
            const { error: piezaError } = await supabase
                .from('almacen_piezas')  // ← AQUÍ EL CAMBIO
                .insert([{
                    escuderia_id: fabricacion.escuderia_id,
                    area: areaId,
                    orden_pieza: fabricacion.orden_pieza || 1,
                    nombre_visible: fabricacion.nombre_visible || areaId,
                    puntos_reales: this.generarPuntosOcultos(areaId),
                    calidad_interna: this.generarCalidadOculta(),
                    equipada: false,
                    fabricada_en: new Date().toISOString(),
                    creada_en: new Date().toISOString()
                }]);

            if (piezaError) throw piezaError;

            // 4. Marcar fabricación como completada
            const { error: updateError } = await supabase
                .from('fabricacion_actual')
                .update({ completada: true })
                .eq('id', fabricacionId);

            if (updateError) throw updateError;



            // 6. Remover de lista local
            this.produccionesActivas = this.produccionesActivas.filter(f => f.id !== fabricacionId);

            // 7. Limpiar timer
            if (this.timers[fabricacionId]) {
                clearInterval(this.timers[fabricacionId]);
                delete this.timers[fabricacionId];
            }

            // 8. Actualizar UI
            setTimeout(() => this.actualizarUIProduccion(), 100);

            console.log(`✅ Pieza "${areaId}" recogida y almacenada`);
            
            // 9. Mostrar notificación
            if (window.f1Manager && window.f1Manager.showNotification) {
                window.f1Manager.showNotification(`✅ Pieza de ${fabricacion.area} recogida`, 'success');
            }

            // 10. Actualizar almacén si está abierto
            if (window.tabManager && window.tabManager.currentTab === 'almacen') {
                setTimeout(() => window.tabManager.loadAlmacenPiezas(), 1000);
            }
            
            return true;

        } catch (error) {
            console.error('❌ Error recogiendo pieza:', error);
            alert('Error al recoger la pieza');
            return false;
        }
    }

    async obtenerSiguienteOrden(areaId) {
        // AÑADE ESTO AL PRINCIPIO:
        if (!this.escuderiaId) {
            console.error('❌ No hay escuderiaId en obtenerSiguienteOrden');
            return 1;
        }
        
        try {
            const { data, error } = await supabase
                .from('almacen_piezas')
                .select('orden_pieza')
                .eq('escuderia_id', this.escuderiaId)
                .eq('area', areaId)
                .order('orden_pieza', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            return data && data.length > 0 ? data[0].orden_pieza + 1 : 1;
            
        } catch (error) {
            console.error('Error obteniendo orden:', error);
            return 1;
        }
    }

    
    async obtenerNombrePieza(areaId, orden) {
        const listas50Piezas = {
            motor: [
                "Motor V6 Básico", "Turbo Compresor T1", "Bloque Aleación V8", "Culata Racing", "Árbol de Levas Sport",
                "Inyección Directa Pro", "Sistema ERS Gen1", "Bomba Agua Racing", "Radiador Intercooler", "Colector Admisión",
                "Escape Titanio V1", "Filtro Aire Comp", "Sensor MAP Pro", "Bobinas Ignición", "Bujías Iridium",
                "Correa Distribución", "Bomba Aceite Seco", "Cárter Aluminio", "Junta Culata", "Válvulas Titanio",
                "Resorte Válvulas", "Levas Racing", "Retenes Racing", "Soporte Motor", "Tensor Correa",
                "Termostato Racing", "Refrigerante Pro", "Sonda Lambda", "Catalizador Hi-Flow", "Silenciador Deportivo",
                "Downpipe Stage1", "Wastegate 38mm", "BOV Compressor", "Intercooler Upgrade", "Fuel Rail",
                "Inyectores 1000cc", "Regulador Presión", "Bomba Combustible", "Filtro Combustible", "Líneas AN",
                "Control Tracción V1", "Launch Control", "Anti-lag System", "Flat Shift", "Rev Limiter",
                "Data Logger", "ECU Flash V1", "Tune Stage 1", "Tune Stage 2", "Motor V10 Extreme"
            ],
            chasis: [
                "Chasis Monocasco", "Estructura Carbono V1", "Suspensión Pushrod", "Bastidor Titanio", "Paneles Kevlar",
                "Túnel Central", "Piso Plano V1", "Estribos Racing", "Torre Suspensión", "Brazos Upper",
                "Brazos Lower", "Rótulas Titanio", "Rodamientos Cerámicos", "Cojinetes", "Casquillos Poly",
                "Barra Antivuelco V1", "Protección Lateral", "Celluloid Safety", "Halo System", "Cockpit Protection",
                "Asiento Fibra", "Arneses 6pt", "Apoyacabezas", "Pedalera Ajust", "Column Dirección",
                "Caja Cambios Mount", "Tapa Diferencial", "Semiejes", "Juntas Homocinéticas", "Portaejes",
                "Soporte Motor V1", "Bastidor Delantero", "Subchasis Trasero", "Fuselaje Central", "Estructura Crash",
                "Zona Deformable", "Protección Fuel", "Tanque Combustible", "Sistema Extinción", "Batería Litio",
                "Wiring Harness", "Loom Protección", "Conectores Racing", "Fusibles High-Amp", "Relays Solid State",
                "Ground Straps", "Buss Bars", "Terminal Blocks", "Cableado Shielded", "Chasis Carbono Full"
            ],
            frenos: [
                "Discos Carbono", "Pastillas Racing", "Líquido High-Temp", "Pinzas Forjadas", "Sistema ABS Pro",
                "Discos Perforados", "Discos Rayados", "Campanas Aluminio", "Mordazas 6 Pistón", "Mordazas 4 Pistón",
                "Cilindros Maestros", "Bombines", "Líneas Braided", "Proportioning Valve", "Bias Bar",
                "Pedal Brake", "Servo Asist", "Sensor ABS", "Tonillos Bleed", "Pistons Ceramic",
                "Seals High-Temp", "Shims Anti-noise", "Wear Sensors", "Brake Ducting", "Cooling Vanes",
                "Dust Shields", "Mounting Brackets", "Anti-rattle Clips", "Retaining Pins", "Springs Caliper",
                "Pads Track", "Pads Street", "Pads Endurance", "Discs 330mm", "Discs 355mm",
                "Discs 380mm", "Caliper Bridge", "Bleeder Nipples", "Brake Lines Kit", "Fluid DOT4",
                "Fluid DOT5.1", "Catch Tank", "Brake Bias Controller", "Pedal Box", "Master Cylinder Kit",
                "Slave Cylinder", "Handbrake Lever", "Cable Handbrake", "Brake Light Switch", "Frenos Carbono-Cerámicos"
            ],
            aleron_delantero: [
                "Alerón Básico", "Perfil Laminar V1", "Elemento Multi", "Aleta Gurney", "Flap DRS",
                "Endplate Standard", "Mainplane V1", "Winglet Ángulo", "Mount Brackets", "Pylon Supports",
                "Adjust Mechanism", "Flap Actuator", "DRS Actuator", "Position Sensor", "Load Cells",
                "Aero Fins", "Vortex Generators", "Cascade Elements", "Turn vanes", "Bargeboards",
                "Y250 Wing", "Outwash Wing", "Inwash Element", "Strake Kit", "Wing Flap",
                "Wing Slat", "Spoiler", "Splitter", "Canards", "Dive Planes",
                "Aero Disc", "Wheel Covers", "Bargeboard Fins", "Vane Array", "Flow Conditioner",
                "Boundary Layer", "Stall Strips", "Gurney Flap", "Wicker Bill", "Trim Tabs",
                "Aero Balance", "Static Ports", "Pitot Tube", "Aero Rake", "Pressure Taps",
                "Tuft Grid", "Smoke Wire", "Flow Vis", "Alerón Doble Elemento", "Alerón Triple Elemento"
            ],
            aleron_trasero: [
                "Alerón Trasero", "DRS Pasivo V1", "Winglet Ángulo", "Mainplane", "Endplate",
                "Beam Wing", "Monkey Seat", "Diffuser Gurney", "Wing Flap", "Wing Slat",
                "Mounting Pillars", "Hydraulic Ram", "Position Sensor", "Load Sensor", "Pivot Mechanism",
                "Adjuster Screw", "Locking Pin", "Safety Cable", "Aero Fins", "Vortex Generators",
                "Cascade Array", "Turning Vanes", "Stall Fence", "Gurney Strip", "Wicker Bill",
                "Trim Tab", "Balance Panel", "Static Port", "Pitot Array", "Pressure Sensor",
                "Tuft Array", "Flow Vis Kit", "Smoke Generator", "Aero Rake", "Boundary Suction",
                "Separation Edge", "Reattachment Lip", "Coanda Surface", "Blown Wing", "Slot Gap",
                "Trailing Edge", "Leading Edge", "Camber Line", "Chord Line", "Span Wise",
                "Tip Vortex", "Wingtip Fence", "Endplate Fins", "Alerón DRS Activo", "Alerón Doble Flap"
            ],
            caja_cambios: [
                "Caja 7 Vel", "Secuencial S1", "Diferencial Auto", "Embrague Cerámico", "Selector Quickshift",
                "Synchro Rings", "Dog Rings", "Selector Forks", "Shift Rods", "Shift Drum",
                "Gear Sets", "Input Shaft", "Output Shaft", "Layshaft", "Countershaft",
                "Bearings", "Bushings", "Seals", "Gaskets", "Oil Pump",
                "Oil Cooler", "Filter", "Magnet", "Drain Plug", "Fill Plug",
                "Breather", "Case", "Bellhousing", "Adapter Plate", "Mounting Brackets",
                "Linkage Kit", "Cable Kit", "Hydraulic Kit", "Pneumatic Kit", "Actuator",
                "Solenoid", "Sensor Speed", "Sensor Position", "Sensor Temp", "Sensor Pressure",
                "ECU Gearbox", "Software Tune", "Calibration Kit", "Launch Control", "Flat Shift",
                "Auto Blip", "Auto Shift", "Paddle Shifters", "Sequential Shifter", "Caja 8 Vel Secuencial"
            ],
            suspension: [
                "Amortiguadores", "Muelles Coilover", "Barra Antivuelco", "Brazos Ajustables", "Rótulas Racing",
                "Top Mounts", "Strut Brace", "Wishbones", "Trailing Arms", "Control Arms",
                "Tie Rods", "Steering Arms", "Ball Joints", "Rod Ends", "Heim Joints",
                "Bushings Poly", "Bushings Rubber", "Bushings Spherical", "Bump Stops", "Dust Boots",
                "Bellows", "Seals", "Pistons", "Shims", "Valving",
                "Springs Linear", "Springs Progressive", "Springs Tender", "Spring Helpers", "Preload Adjusters",
                "Ride Height Adjust", "Damping Adjust", "Rebound Adjust", "Compression Adjust", "Fast Bump",
                "Slow Rebound", "Reservoirs", "Remote Canisters", "Nitrogen Charge", "Bleed Valves",
                "Mounting Brackets", "Spacers", "Shims Pack", "Hardware Kit", "Suspensión Push-Pull Pro"
            ],
            electronica: [
                "ECU Básica", "Telemetría Pro", "Sensors Pack V1", "Control Tracción", "ERS Manager",
                "Data Logger", "Dash Display", "Steering Wheel", "Button Box", "Rotary Encoders",
                "Toggle Switches", "Push Buttons", "Rotary Dials", "LCD Screen", "LED Lights",
                "Wiring Harness", "Connectors", "Terminals", "Fuses", "Relays",
                "Circuit Breakers", "Power Distribution", "Ground Points", "Shielded Cable", "Twisted Pair",
                "CAN Bus", "LIN Bus", "Ethernet", "WiFi Module", "Bluetooth",
                "GPS Antenna", "IMU Sensor", "Accelerometer", "Gyroscope", "Magnetometer",
                "Pressure Sensors", "Temp Sensors", "Flow Sensors", "Position Sensors", "Speed Sensors",
                "Load Cells", "Strain Gauges", "Thermocouples", "RTDs", "Hall Effect",
                "Optical Sensors", "Ultrasonic", "Radar", "Lidar", "Sistema Telemetría Full"
            ],
            volante: [
                "Volante Std", "Display LCD V1", "Botones Paddle", "Grip Alcantara", "Quick Release",
                "Hub Adapter", "Spacer", "Lock Ring", "Release Mechanism", "Wiring Slip Ring",
                "Connector", "Cable", "Shift Lights", "Rev Lights", "Gear Display",
                "Speed Display", "RPM Display", "Temp Display", "Pressure Display", "Lap Timer",
                "Delta Timer", "Fuel Calc", "Tire Temp", "Brake Bias", "Traction Control",
                "Engine Map", "DRS Button", "Pit Limiter", "Radio Button", "Drink Button",
                "OVERTAKE Button", "PAGE Button", "SCROLL Wheel", "ENTER Button", "BACK Button",
                "MENU Button", "OK Button", "CANCEL Button", "RESET Button", "LAP Button",
                "PIT Button", "BOX Button", "IN Button", "OUT Button", "YES Button",
                "NO Button", "UP Button", "DOWN Button", "LEFT Button", "Volante Full Carbon"
            ],
            suelo: [
                "Suelo Plano", "Difusor Pasivo V1", "Túneles Venturi", "Skid Block", "Step Plane",
                "Reference Plane", "Ride Height", "Rake Angle", "Platform", "Tunnel Inlet",
                "Tunnel Outlet", "Throat Area", "Expansion Zone", "Diffuser Angle", "Strake Kit",
                "Vortex Generators", "Gurney Flap", "Wicker Bill", "Fence", "Splitter",
                "Splinter", "Serrations", "Slots", "Holes", "Vents",
                "Ducts", "Channels", "Grooves", "Ribs", "Stiffeners",
                "Baffles", "Bulkheads", "Longerons", "Frames", "Ribs Transverse",
                "Ribs Longitudinal", "Skin Panels", "Floor Pan", "Tunnel Pan", "Diffuser Pan",
                "Sidepod Floor", "Coke Bottle", "Waist", "Shoulder", "Hip",
                "Teardrop", "Bulge", "Scoop", "NACA Duct", "Suelo Venturi Activo"
            ],
            pontones: [
                "Pontón Estándar", "Sidepod Slim V1", "Cooling Duct", "Radiotor Pack", "Aero Cove",
                "Inlet", "Outlet", "Cowling", "Fairing", "Cover",
                "Panel", "Door", "Louver", "Gill", "Vent",
                "Duct", "Channel", "Passage", "Manifold", "Header",
                "Collector", "Muffler", "Silencer", "Resonator", "Baffle",
                "Matrix", "Core", "Fin", "Tube", "Pipe",
                "Hose", "Line", "Fitting", "Adapter", "Reducer",
                "Elbow", "Tee", "Cross", "Cap", "Plug",
                "Flange", "Gasket", "Seal", "Clamp", "Bracket",
                "Mount", "Support", "Hanger", "Stay", "Pontón Aero-Cooling Pro"
            ]
        };
        
        if (!listas50Piezas[areaId]) {
            return `${areaId.charAt(0).toUpperCase() + areaId.slice(1)} ${orden}`;
        }
        
        const lista = listas50Piezas[areaId];
        if (orden > lista.length) {
            return `${lista[orden % lista.length]} ${Math.floor(orden / lista.length) + 1}`;
        }
        
        return lista[orden - 1] || `${areaId} Pieza ${orden}`;
    }


    // NUEVA FUNCIÓN: Solo actualiza contadores
    actualizarContadoresTiempo() {
        this.produccionesActivas.forEach(fab => {
            // CAMBIO AQUÍ: Solo actualizar contadores si NO está lista para recoger
            if (fab.estado !== 'lista_para_recoger') {
                const elemento = document.querySelector(`[data-fabricacion-id="${fab.id}"] .fab-tiempo`);
                if (elemento) {
                    const ahora = new Date();
                    const tiempoFin = new Date(fab.tiempo_fin);
                    const tiempoRestante = Math.max(0, tiempoFin - ahora);
                    
                    if (tiempoRestante > 0) {
                        const minutos = Math.floor(tiempoRestante / 60000);
                        const segundos = Math.floor((tiempoRestante % 60000) / 1000);
                        elemento.textContent = `Listo en: ${minutos}m ${segundos}s`;
                    } else {
                        // Cuando se acaba el tiempo, marcamos como lista
                        fab.estado = 'lista_para_recoger';
                        elemento.textContent = '¡Lista para recoger!';
                        
                        // Actualizar el badge también
                        const badge = document.querySelector(`[data-fabricacion-id="${fab.id}"] .estado-badge`);
                        if (badge) {
                            badge.textContent = '✅ LISTA';
                            badge.className = 'estado-badge lista';
                        }
                    }
                }
            }
        });
    }

    // NUEVA FUNCIÓN: Generar HTML una sola vez
    generarHTMLFabricacion(fab) {
        const ahora = new Date();
        const tiempoFin = new Date(fab.tiempo_fin);
        const tiempoRestante = Math.max(0, tiempoFin - ahora);
        const lista = tiempoRestante <= 0 || fab.estado === 'lista_para_recoger';
        const minutos = Math.floor(tiempoRestante / 60000);
        const segundos = Math.floor((tiempoRestante % 60000) / 1000);
        
        return `
            <div class="fabricacion-item ${lista ? 'lista' : 'fabricando'}" data-fabricacion-id="${fab.id}">
                <div class="fabricacion-info">
                    <div class="fab-area">
                        <i class="fas fa-cog"></i>
                        <span>${fab.nombre_visible || fab.area}</span>
                    </div>
                    <div class="fab-estado">
                        <span class="estado-badge ${lista ? 'lista' : 'fabricando'}">
                            ${lista ? '✅ LISTA' : `⏳ ${minutos}m ${segundos}s`}
                        </span>
                    </div>
                </div>
                
                <div class="fab-progreso">
                    <div class="progress-bar-small">
                        <div class="progress-fill-small" 
                             style="width: ${Math.min(100, ((fab.duracionTotal - tiempoRestante) / fab.duracionTotal) * 100)}%">
                        </div>
                    </div>
                    <div class="fab-tiempo">
                        <i class="far fa-clock"></i>
                        <span>${lista ? '¡Lista para recoger!' : `Listo en: ${minutos}m ${segundos}s`}</span>
                    </div>
                </div>
                
                ${lista ? `
                <div class="fab-acciones">
                    <button class="btn-recoger-pieza" 
                            onclick="window.fabricacionManager.recogerPieza('${fab.id}')">
                        <i class="fas fa-box-open"></i> Recoger Pieza
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }

    formatearTiempo(milisegundos) {
        const segundos = Math.floor(milisegundos / 1000);
        const minutos = Math.floor(segundos / 60);
        const horas = Math.floor(minutos / 60);
        
        if (horas > 0) {
            return `${horas}h ${minutos % 60}m`;
        } else if (minutos > 0) {
            return `${minutos}m ${segundos % 60}s`;
        } else {
            return `${segundos}s`;
        }
    }



    async cancelarFabricacion(fabricacionId) {
        try {
            const { error } = await supabase
                .from('fabricacion_actual')
                .delete()
                .eq('id', fabricacionId);

            if (error) throw error;

            this.produccionesActivas = this.produccionesActivas.filter(f => f.id !== fabricacionId);

            if (this.timers[fabricacionId]) {
                clearInterval(this.timers[fabricacionId]);
                delete this.timers[fabricacionId];
            }

            this.actualizarUIProduccion();

            console.log('✅ Fabricación cancelada');
            return true;

        } catch (error) {
            console.error('❌ Error cancelando fabricación:', error);
            return false;
        }
    }
}

// Inicializar globalmente
window.FabricacionManager = FabricacionManager;

// Crear instancia cuando se necesite
window.crearFabricacionManager = function() {
    if (!window.fabricacionManager) {
        window.fabricacionManager = new FabricacionManager();
        console.log('✅ Instancia de FabricacionManager creada');
    }
    return window.fabricacionManager;
};

console.log('✅ Clase FabricacionManager registrada');

// Función para obtener o crear el manager
window.getFabricacionManager = function() {
    if (!window.fabricacionManager) {
        window.fabricacionManager = new FabricacionManager();
        if (window.f1Manager && window.f1Manager.escuderia) {
            window.fabricacionManager.inicializar(window.f1Manager.escuderia.id);
        }
    }
    return window.fabricacionManager;
};

console.log('🔧 Sistema de fabricación listo');
