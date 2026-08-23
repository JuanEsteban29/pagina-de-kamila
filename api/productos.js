const fs = require('fs');
const path = require('path');

function getSupabaseUrl(path = '') {
    let baseUrl = (process.env.SUPABASE_URL || 'https://vxswjaixnlfwgtqrwcf.supabase.co').trim().replace(/\/+$/, '');
    if (baseUrl.endsWith('/rest/v1')) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 8).replace(/\/+$/, '');
    }
    return `${baseUrl}/rest/v1${path}`;
}

const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getHeaders(prefer) {
    const h = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };
    if (prefer) h['Prefer'] = prefer;
    return h;
}

function parseRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(r => ({
        id: Number(r.id),
        title: r.title || '',
        price: parseFloat(r.price) || 0,
        category: r.category || 'labios',
        img: r.img || '',
        images: typeof r.images === 'string' ? JSON.parse(r.images) : (Array.isArray(r.images) ? r.images : []),
        stock: parseInt(r.stock) || 0,
        badge: r.badge || '',
        tones: r.tones || '',
        toneObjects: typeof r.toneObjects === 'string' ? JSON.parse(r.toneObjects) : (Array.isArray(r.toneObjects) ? r.toneObjects : []),
        created_at: r.created_at || null,
        updated_at: r.updated_at || null
    }));
}

function obtenerProductosBaseDisco() {
    try {
        const jsonPath = path.join(process.cwd(), 'js', 'productos.json');
        if (fs.existsSync(jsonPath)) {
            return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        }
    } catch(e) {}
    return [];
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        const baseItems = obtenerProductosBaseDisco();
        let supaItems = [];

        if (SUPABASE_KEY) {
            try {
                const fetchRes = await fetch(getSupabaseUrl('/productos?select=*&order=id.desc'), {
                    headers: getHeaders(),
                    cache: 'no-store'
                });
                if (fetchRes.ok) {
                    const rows = await fetchRes.json();
                    supaItems = parseRows(rows);
                }
            } catch (e) {
                console.error('[KARA API GET] Error:', e.message);
            }
        }

        // Combinar catálogo: los elementos guardados en Supabase sobrescriben a los base
        const catalogMap = new Map();
        for (const baseItem of baseItems) {
            if (baseItem && baseItem.id) {
                catalogMap.set(Number(baseItem.id), baseItem);
            }
        }
        for (const supaItem of supaItems) {
            if (supaItem && supaItem.id) {
                catalogMap.set(Number(supaItem.id), supaItem);
            }
        }

        const listaFinal = Array.from(catalogMap.values());
        return res.status(200).json(listaFinal);
    }

    if (req.method === 'POST') {
        if (!SUPABASE_KEY) return res.status(503).json({ error: 'Falta configurar SUPABASE_ANON_KEY en Vercel' });
        const body = req.body || {};
        const item = Array.isArray(body) ? body[0] : body;
        const payload = {
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
        try {
            const fetchRes = await fetch(getSupabaseUrl('/productos'), {
                method: 'POST',
                headers: getHeaders('return=representation'),
                body: JSON.stringify(payload)
            });
            if (fetchRes.ok) {
                const rows = await fetchRes.json();
                return res.status(200).json({ success: true, product: parseRows(rows)[0] });
            }
            const errText = await fetchRes.text();
            return res.status(fetchRes.status).json({ error: errText });
        } catch (e) {
            console.error('[KARA API POST] Error:', e.message);
            return res.status(500).json({ error: `No se pudo conectar a Supabase: ${e.message}` });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
};
