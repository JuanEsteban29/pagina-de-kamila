const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos del proyecto en la raíz
app.use(express.static(__dirname));

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vxswjaixnlfwgtqrwcf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

// Cabeceras HTTP para autenticación y consulta a Supabase PostgREST
function getSupabaseHeaders(options = {}) {
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };
    if (options.prefer) {
        headers['Prefer'] = options.prefer;
    }
    return headers;
}

// Convertir respuesta de Supabase a formato estandarizado para la aplicación
function parsearProductosSupabase(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => {
        let images = [];
        let toneObjects = [];

        if (row.images) {
            try {
                images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
            } catch (e) {
                images = [];
            }
        }

        if (row.toneObjects) {
            try {
                toneObjects = typeof row.toneObjects === 'string' ? JSON.parse(row.toneObjects) : row.toneObjects;
            } catch (e) {
                toneObjects = [];
            }
        }

        return {
            id: Number(row.id),
            title: row.title || '',
            price: parseFloat(row.price) || 0,
            category: row.category || 'labios',
            img: row.img || '',
            images: Array.isArray(images) ? images : [],
            stock: parseInt(row.stock) || 0,
            badge: row.badge || '',
            tones: row.tones || '',
            toneObjects: Array.isArray(toneObjects) ? toneObjects : [],
            created_at: row.created_at || null,
            updated_at: row.updated_at || null
        };
    });
}

// Función auxiliar para leer productos desde archivo local js/productos.json (Fallback de seguridad)
function leerProductosFallbackLocal() {
    try {
        const jsonPath = path.join(__dirname, 'js', 'productos.json');
        if (fs.existsSync(jsonPath)) {
            return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        }
    } catch (e) {
        console.warn('[KARA Server] Error al leer productos.json fallback:', e.message);
    }
    return [];
}

// Middleware de normalización de rutas para Vercel Serverless Rewrites
app.use((req, res, next) => {
    if (!req.url.startsWith('/api') && (req.url.startsWith('/productos') || req.url.startsWith('/ping'))) {
        req.url = '/api' + req.url;
    }
    next();
});

// ================================================
// RUTAS DE API (Endpoints Supabase REST)
// ================================================

// 1. GET /api/ping -> Verificar estado del servidor y conexión con Supabase
app.get(['/api/ping', '/ping'], async (req, res) => {
    let supabaseStatus = 'no_configurado';

    if (SUPABASE_KEY) {
        try {
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=id&limit=1`, {
                method: 'GET',
                headers: getSupabaseHeaders(),
                cache: 'no-store'
            });
            supabaseStatus = fetchRes.ok ? 'conectado' : `error: ${fetchRes.status}`;
        } catch (e) {
            supabaseStatus = `error_conexion: ${e.message}`;
        }
    }

    res.json({
        status: 'ok',
        provider: 'supabase',
        supabase_url: SUPABASE_URL,
        supabase_status: supabaseStatus
    });
});

// 2. GET /api/productos -> Obtener catálogo de productos desde Supabase
app.get(['/api/productos', '/productos'], async (req, res) => {
    if (SUPABASE_KEY) {
        try {
            const url = `${SUPABASE_URL}/rest/v1/productos?select=*&order=id.desc`;
            const fetchRes = await fetch(url, {
                method: 'GET',
                headers: getSupabaseHeaders(),
                cache: 'no-store'
            });

            if (fetchRes.ok) {
                const rows = await fetchRes.json();
                return res.json(parsearProductosSupabase(rows));
            } else {
                console.warn(`[KARA Server] Supabase GET HTTP ${fetchRes.status}. Usando fallback local.`);
            }
        } catch (err) {
            console.warn('[KARA Server] Error al consultar Supabase (usando fallback local):', err.message);
        }
    } else {
        console.info('[KARA Server] SUPABASE_ANON_KEY no configurada aún en el servidor. Usando catálogo local.');
    }

    // Fallback local en disco
    const fallbackData = leerProductosFallbackLocal();
    res.json(fallbackData);
});

// 3. POST /api/productos -> Crear un nuevo producto en Supabase (id generado por Supabase)
app.post(['/api/productos', '/productos'], async (req, res) => {
    const body = req.body;
    const item = Array.isArray(body) ? body[0] : body;

    if (!item) {
        return res.status(400).json({ error: 'Payload de producto no válido' });
    }

    const payloadSupabase = {
        title: item.title || 'Nuevo Producto',
        price: parseFloat(item.price) || 0,
        category: item.category || 'labios',
        img: item.img || '',
        images: Array.isArray(item.images) ? item.images : [],
        stock: parseInt(item.stock) || 0,
        badge: item.badge || '',
        tones: item.tones || '',
        toneObjects: Array.isArray(item.toneObjects) ? item.toneObjects : []
    };

    if (SUPABASE_KEY) {
        try {
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
                method: 'POST',
                headers: getSupabaseHeaders({ prefer: 'return=representation' }),
                body: JSON.stringify(payloadSupabase)
            });

            if (fetchRes.ok) {
                const createdRows = await fetchRes.json();
                const createdProduct = parsearProductosSupabase(createdRows)[0];
                return res.json({
                    success: true,
                    product: createdProduct,
                    storage: 'supabase'
                });
            } else {
                const errorText = await fetchRes.text();
                console.error('[KARA Server] Error al crear en Supabase:', fetchRes.status, errorText);
                return res.status(fetchRes.status).json({ error: 'Error de Supabase', details: errorText });
            }
        } catch (err) {
            console.error('[KARA Server] Excepción al crear en Supabase:', err.message);
            return res.status(500).json({ error: 'Excepción de servidor', details: err.message });
        }
    }

    res.status(503).json({ error: 'Supabase no está configurado con claves en el servidor.' });
});

// 4. PUT /api/productos/:id -> Actualizar un producto existente por su ID en Supabase
app.put(['/api/productos/:id', '/productos/:id'], async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'ID de producto no válido' });
    }

    const payloadSupabase = {
        title: body.title,
        price: parseFloat(body.price) || 0,
        category: body.category,
        img: body.img,
        images: Array.isArray(body.images) ? body.images : [],
        stock: parseInt(body.stock) || 0,
        badge: body.badge || '',
        tones: body.tones || '',
        toneObjects: Array.isArray(body.toneObjects) ? body.toneObjects : [],
        updated_at: new Date().toISOString()
    };

    if (SUPABASE_KEY) {
        try {
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
                method: 'PATCH',
                headers: getSupabaseHeaders({ prefer: 'return=representation' }),
                body: JSON.stringify(payloadSupabase)
            });

            if (fetchRes.ok) {
                const updatedRows = await fetchRes.json();
                const updatedProduct = parsearProductosSupabase(updatedRows)[0] || { ...payloadSupabase, id };
                return res.json({
                    success: true,
                    product: updatedProduct,
                    storage: 'supabase'
                });
            } else {
                const errorText = await fetchRes.text();
                console.error(`[KARA Server] Error al actualizar ID ${id} en Supabase:`, fetchRes.status, errorText);
                return res.status(fetchRes.status).json({ error: 'Error al actualizar en Supabase', details: errorText });
            }
        } catch (err) {
            console.error('[KARA Server] Excepción al actualizar en Supabase:', err.message);
            return res.status(500).json({ error: 'Excepción de servidor', details: err.message });
        }
    }

    res.status(503).json({ error: 'Supabase no está configurado con claves en el servidor.' });
});

// 5. DELETE /api/productos/:id -> Eliminar un producto por su ID en Supabase
app.delete(['/api/productos/:id', '/productos/:id'], async (req, res) => {
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'ID de producto no válido' });
    }

    if (SUPABASE_KEY) {
        try {
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
                method: 'DELETE',
                headers: getSupabaseHeaders()
            });

            if (fetchRes.ok) {
                return res.json({ success: true, id, storage: 'supabase' });
            } else {
                const errorText = await fetchRes.text();
                console.error(`[KARA Server] Error al eliminar ID ${id} en Supabase:`, fetchRes.status, errorText);
                return res.status(fetchRes.status).json({ error: 'Error al eliminar de Supabase', details: errorText });
            }
        } catch (err) {
            console.error('[KARA Server] Excepción al eliminar de Supabase:', err.message);
            return res.status(500).json({ error: 'Excepción de servidor', details: err.message });
        }
    }

    res.status(503).json({ error: 'Supabase no está configurado con claves en el servidor.' });
});

// 6. Ruta Catch-All GET * -> Servir aplicación web (index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Exportar la aplicación para Vercel Serverless
module.exports = app;

// Iniciar servidor Express en desarrollo local
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[KARA Server] Servidor corriendo en el puerto ${PORT} (Supabase Backend) 🚀`);
    });
}
