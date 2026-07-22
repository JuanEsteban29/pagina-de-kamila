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

    if (process.env.MYSQL_URL) {
        pool = mysql.createPool(process.env.MYSQL_URL);
    } else if (process.env.MYSQL_PRIVATE_URL) {
        pool = mysql.createPool(process.env.MYSQL_PRIVATE_URL);
    } else {
        pool = mysql.createPool({
            host: process.env.MYSQLHOST || 'localhost',
            user: process.env.MYSQLUSER || 'root',
            password: process.env.MYSQLPASSWORD || '',
            database: process.env.MYSQLDATABASE || 'railway',
            port: parseInt(process.env.MYSQLPORT || '3306'),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
    return pool;
}

// Inicialización automática de la tabla de productos si no existe
async function initDatabase() {
    try {
        const db = getPool();
        await db.query(`
            CREATE TABLE IF NOT EXISTS productos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                category VARCHAR(100) NOT NULL DEFAULT 'labios',
                img LONGTEXT,
                images LONGTEXT,
                stock INT NOT NULL DEFAULT 1,
                tones TEXT,
                toneObjects LONGTEXT,
                badge VARCHAR(100) DEFAULT ''
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('[KARA Server] Tabla "productos" lista y verificada en MySQL. 🚀');
    } catch (err) {
        console.warn('[KARA Server] Aviso de conexión a MySQL (modo fallback disponible):', err.message);
    }
}

// Inicializar la base de datos en segundo plano
initDatabase();

// ================================================
// RUTAS DE API (Endpoints)
// ================================================

// 1. GET /api/ping -> Estado del servidor
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok' });
});

// 2. GET /api/productos -> Consulta todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const db = getPool();
        const [rows] = await db.query('SELECT * FROM productos ORDER BY id DESC');

        // Si la tabla MySQL recién se creó y está vacía, sembrar productos base iniciales desde productos.json
        if (rows.length === 0) {
            const jsonPath = path.join(__dirname, 'js', 'productos.json');
            if (fs.existsSync(jsonPath)) {
                const baseProductos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                const querySeed = `
                    INSERT INTO productos (id, title, price, category, img, images, stock, tones, toneObjects, badge)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        title = VALUES(title), price = VALUES(price), category = VALUES(category),
                        img = VALUES(img), images = VALUES(images), stock = VALUES(stock),
                        tones = VALUES(tones), toneObjects = VALUES(toneObjects), badge = VALUES(badge);
                `;
                for (const p of baseProductos) {
                    await db.query(querySeed, [
                        p.id || null,
                        p.title || '',
                        parseFloat(p.price) || 0,
                        p.category || 'labios',
                        p.img || '',
                        JSON.stringify(p.images || []),
                        parseInt(p.stock) || 0,
                        p.tones || '',
                        JSON.stringify(p.toneObjects || []),
                        p.badge || ''
                    ]);
                }
                const [seededRows] = await db.query('SELECT * FROM productos ORDER BY id DESC');
                return res.json(parsearFilasProductos(seededRows));
            }
        }

        res.json(parsearFilasProductos(rows));
    } catch (err) {
        console.error('[KARA Server] Error en GET /api/productos:', err.message);
        // Fallback resiliente si MySQL aún no responde: servir productos.json local
        try {
            const jsonPath = path.join(__dirname, 'js', 'productos.json');
            if (fs.existsSync(jsonPath)) {
                const fallbackData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                return res.json(fallbackData);
            }
        } catch (e) {}
        res.status(500).json({ error: 'Error al consultar productos', details: err.message });
    }
});

// Función auxiliar para parsear campos JSON y tipos numéricos
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
            id: row.id,
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

// 3. POST /api/productos -> Guardar / Actualizar productos en MySQL
app.post('/api/productos', async (req, res) => {
    try {
        const db = getPool();
        const payload = req.body;
        const listaProductos = Array.isArray(payload) ? payload : [payload];

        if (listaProductos.length === 0) {
            return res.json({ success: true, message: 'Array vacío' });
        }

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

        for (const p of listaProductos) {
            const imagesStr = JSON.stringify(p.images || []);
            const toneObjectsStr = JSON.stringify(p.toneObjects || []);
            const priceVal = parseFloat(p.price) || 0;
            const stockVal = parseInt(p.stock) || 0;

            await db.query(queryUpsert, [
                p.id || null,
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

        console.log(`[KARA Server] Sincronizados ${listaProductos.length} productos en MySQL.`);
        res.json({ success: true, count: listaProductos.length });
    } catch (err) {
        console.error('[KARA Server] Error en POST /api/productos:', err.message);
        res.status(500).json({ error: 'Error al guardar productos', details: err.message });
    }
});

// 4. Ruta Catch-All GET * -> Sirve la aplicación principal (index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor Express
app.listen(PORT, () => {
    console.log(`[KARA Server] Servidor activo escuchando en el puerto ${PORT}`);
});
