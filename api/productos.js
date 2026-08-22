const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vxswjaixnlfwgtqrwcf.supabase.co';
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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        if (!SUPABASE_KEY) return res.status(200).json([]);
        try {
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*&order=id.desc`, {
                headers: getHeaders(),
                cache: 'no-store'
            });
            if (fetchRes.ok) {
                const rows = await fetchRes.json();
                return res.status(200).json(parseRows(rows));
            }
            return res.status(fetchRes.status).json([]);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'POST') {
        if (!SUPABASE_KEY) return res.status(503).json({ error: 'Falta SUPABASE_ANON_KEY' });
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
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
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
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
};
