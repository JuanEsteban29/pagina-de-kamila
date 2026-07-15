const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite cargar imágenes en base64 grandes en el JSON si fuera necesario
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servir la carpeta raíz como estática
app.use(express.static(__dirname));

// API para verificar si el servidor está activo
app.get('/api/ping', (req, res) => {
    res.json({ success: true, message: 'Server is active' });
});

// API para guardar el catálogo actualizado en productos.json
app.post('/api/productos', (req, res) => {
    const productos = req.body;
    if (!Array.isArray(productos)) {
        return res.status(400).json({ error: 'La base de datos debe ser un arreglo de productos' });
    }

    // Evitar que el catálogo quede vacío por peticiones de prueba o caché
    if (productos.length === 0) {
        console.warn('Petición de catálogo vacío ignorada por seguridad.');
        return res.json({ success: true, message: 'Operación ignorada por seguridad.' });
    }

    const filePath = path.join(__dirname, 'js', 'productos.json');
    fs.writeFile(filePath, JSON.stringify(productos, null, 4), 'utf8', (err) => {
        if (err) {
            console.error('Error al escribir productos.json:', err);
            return res.status(500).json({ error: 'No se pudo guardar la base de datos de productos.' });
        }
        console.log('Base de datos de productos.json actualizada correctamente por la administradora.');
        return res.json({ success: true, message: 'Catálogo de productos actualizado correctamente.' });
    });
});

app.listen(PORT, () => {
    console.log('==================================================');
    console.log(`🌸 KARA Cosmetics — Servidor de Desarrollo Activo 🌸`);
    console.log(`Accede en tu navegador: http://localhost:${PORT}`);
    console.log(`Panel de Administración: http://localhost:${PORT}/admin.html`);
    console.log('==================================================');
});
