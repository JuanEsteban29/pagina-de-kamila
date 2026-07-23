const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
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

// Configuración del pool de conexión a MySQL
let pool = null;

function getPool() {
    if (pool) return pool;

    try {
        const host = process.env.MYSQLHOST || process.env.MYSQL_HOST;
        const user = process.env.MYSQLUSER || process.env.MYSQL_USER;
        const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD;
        const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway';
        const port = parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306');

        if (host && user) {
            console.log(`[KARA Server] Configurando pool de MySQL con Host: ${host}:${port}, DB: ${database}`);
            pool = mysql.createPool({
                host,
                user,
                password: password || '',
                database,
                port,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                connectTimeout: 20000,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            });
        } else if (process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL || process.env.DATABASE_URL) {
            const urlStr = process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL || process.env.DATABASE_URL;
            console.log('[KARA Server] Configurando pool de MySQL usando URL de conexión...');
            pool = mysql.createPool(urlStr);
        } else {
            console.log('[KARA Server] No se detectaron variables de MySQL en Railway. Usando modo de persistencia local en disco (js/productos.json).');
            pool = null;
        }
    } catch (e) {
        console.error('[KARA Server] Error al crear pool de MySQL:', e.message);
        pool = null;
    }
    return pool;
}

// Inicialización automática de la tabla de productos si no existe
async function initDatabase() {
    try {
        const db = getPool();
        if (!db) return;

        // 1. Crear tabla si no existe (usando BIGINT para IDs seguros de JavaScript)
        await db.query(`
            CREATE TABLE IF NOT EXISTS productos (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                category VARCHAR(100) NOT NULL DEFAULT 'labios',
                img LONGTEXT,
                images LONGTEXT,
                stock INT NOT NULL DEFAULT 1,
                tones TEXT,
                toneObjects LONGTEXT,
                badge VARCHAR(100) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Asegurar que el id sea BIGINT en caso de que se haya creado previamente como INT
        try {
            await db.query(`ALTER TABLE productos MODIFY id BIGINT AUTO_INCREMENT;`);
        } catch (e) {}

        console.log('[KARA Server] Tabla "productos" verificada y lista en MySQL. 🚀');

        // 2. Comprobar si la tabla está vacía y sembrarla con los productos iniciales de js/productos.json
        const [rows] = await db.query('SELECT COUNT(*) AS total FROM productos');
        if (rows && rows[0] && rows[0].total === 0) {
            console.log('[KARA Server] La tabla "productos" en MySQL está vacía. Sembrando productos iniciales...');
            const jsonPath = path.join(__dirname, 'js', 'productos.json');
            if (fs.existsSync(jsonPath)) {
                const baseProductos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                await sincronizarListaConMySQL(db, baseProductos);
                console.log(`[KARA Server] ¡Base de datos MySQL sembrada con éxito con ${baseProductos.length} productos! 🎉`);
            }
        }
    } catch (err) {
        console.warn('[KARA Server] Aviso al inicializar base de datos MySQL:', err.message);
    }
}

// Inicializar en segundo plano al arrancar el servidor
initDatabase();

// Función auxiliar para sincronizar la lista de productos con MySQL (con borrado de eliminados)
async function sincronizarListaConMySQL(db, lista) {
    if (!db) return;
    if (!Array.isArray(lista)) return;

    try {
        // 1. Obtener los IDs válidos presentes en el nuevo catálogo
        const idsValidos = lista
            .map(p => parseInt(p.id))
            .filter(id => !isNaN(id) && id > 0);

        // 2. Si hay productos en la lista, borrar de MySQL cualquier producto que haya sido eliminado
        if (idsValidos.length > 0) {
            const placeholders = idsValidos.map(() => '?').join(',');
            await db.query(`DELETE FROM productos WHERE id NOT IN (${placeholders})`, idsValidos);
        } else {
            await db.query('TRUNCATE TABLE productos');
        }

        // 3. Insertar o actualizar cada producto en MySQL
        const queryUpsert = `
            INSERT INTO productos (id, title, price, category, img, images, stock, tones, toneObjects, badge)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                price = VALUES(price),
                category = VALUES(category),
                img = VALUES(img),
                images = VALUES(images),
                stock = VALUES(stock),
                tones = VALUES(tones),
                toneObjects = VALUES(toneObjects),
                badge = VALUES(badge);
        `;

        for (const p of lista) {
            const idVal = (p.id && !isNaN(parseInt(p.id)) && parseInt(p.id) > 0) ? parseInt(p.id) : null;
            const imagesStr = JSON.stringify(p.images || []);
            const toneObjectsStr = JSON.stringify(p.toneObjects || []);
            const priceVal = parseFloat(p.price) || 0;
            const stockVal = parseInt(p.stock) || 0;

            await db.query(queryUpsert, [
                idVal,
                p.title || 'Producto sin título',
                priceVal,
                p.category || 'labios',
                p.img || '',
                imagesStr,
                stockVal,
                p.tones || '',
                toneObjectsStr,
                p.badge || ''
            ]);
        }
    } catch (err) {
        console.error('[KARA Server] Error al sincronizar con MySQL:', err.message);
        throw err;
    }
}

// Función auxiliar para actualizar el archivo js/productos.json en disco
function guardarEnDisco(lista) {
    try {
        const jsonPath = path.join(__dirname, 'js', 'productos.json');
        fs.writeFileSync(jsonPath, JSON.stringify(lista, null, 4), 'utf8');
        console.log(`[KARA Server] Archivo js/productos.json actualizado en disco (${lista.length} productos).`);
        return true;
    } catch (err) {
        console.error('[KARA Server] Error al escribir en disco:', err.message);
        return false;
    }
}

// ================================================
// RUTAS DE API (Endpoints)
// ================================================

// 1. GET /api/ping -> Verificar estado del servidor
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok' });
});

// 2. GET /api/productos -> Obtener catálogo de productos
app.get('/api/productos', async (req, res) => {
    try {
        const db = getPool();
        if (db) {
            const [rows] = await db.query('SELECT * FROM productos ORDER BY id DESC');
            if (rows && rows.length > 0) {
                return res.json(parsearFilasProductos(rows));
            }
        }
    } catch (err) {
        console.warn('[KARA Server] Error al leer MySQL (usando productos.json en disco):', err.message);
    }

    // Fallback: servir archivo js/productos.json local
    try {
        const jsonPath = path.join(__dirname, 'js', 'productos.json');
        if (fs.existsSync(jsonPath)) {
            const fallbackData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            return res.json(fallbackData);
        }
    } catch (e) {}

    res.json([]);
});

// Parseador de filas MySQL a objetos JavaScript
function parsearFilasProductos(rows) {
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
            tones: row.tones || '',
            toneObjects: Array.isArray(toneObjects) ? toneObjects : [],
            badge: row.badge || ''
        };
    });
}

// 3. POST /api/productos -> Guardar / Actualizar / Sincronizar catálogo
app.post('/api/productos', async (req, res) => {
    const payload = req.body;
    const listaProductos = Array.isArray(payload) ? payload : [payload];

    // 1. Guardar prioritariamente en el archivo js/productos.json en disco
    guardarEnDisco(listaProductos);

    // 2. Intentar guardar en MySQL si la base de datos está disponible
    let mysqlStatus = 'desconectado';
    try {
        const db = getPool();
        if (db) {
            await sincronizarListaConMySQL(db, listaProductos);
            mysqlStatus = 'sincronizado';
        }
    } catch (err) {
        console.warn('[KARA Server] Advertencia al sincronizar con MySQL (cambio guardado en disco):', err.message);
        mysqlStatus = 'error: ' + err.message;
    }

    // Siempre responder HTTP 200 OK para no bloquear el administrador
    res.json({
        success: true,
        count: listaProductos.length,
        storage: 'disco',
        mysql: mysqlStatus
    });
});

// 4. DELETE /api/productos/:id -> Eliminar un producto específico
app.delete('/api/productos/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        // 1. Eliminar del archivo json en disco
        const jsonPath = path.join(__dirname, 'js', 'productos.json');
        let lista = [];
        if (fs.existsSync(jsonPath)) {
            lista = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        }
        lista = lista.filter(p => parseInt(p.id) !== id);
        guardarEnDisco(lista);

        // 2. Eliminar de MySQL
        try {
            const db = getPool();
            if (db) {
                await db.query('DELETE FROM productos WHERE id = ?', [id]);
            }
        } catch (e) {
            console.warn('[KARA Server] Advertencia al borrar de MySQL:', e.message);
        }

        res.json({ success: true, id });
    } catch (err) {
        console.error('[KARA Server] Error al eliminar:', err.message);
        res.status(500).json({ error: 'Error al eliminar producto', details: err.message });
    }
});

// 5. Ruta Catch-All GET * -> Servir aplicación web (index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor Express
app.listen(PORT, () => {
    console.log(`[KARA Server] Servidor Express corriendo en el puerto ${PORT} 🚀`);
});
