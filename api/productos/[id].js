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

    // Extraer ID de la URL o query param de Vercel
    let id = req.query.id;
    if (!id && req.url) {
        const parts = req.url.split('?')[0].split('/');
        id = parts[parts.length - 1];
    }
    const numId = Number(id);

    if (!numId || isNaN(numId)) {
        return res.status(400).json({ error: 'ID de producto inválido' });
    }

    if (req.method === 'PUT') {
        if (!SUPABASE_KEY) return res.status(503).json({ error: 'Falta SUPABASE_ANON_KEY' });
        const body = req.body || {};
        const payload = {
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
        try {
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${numId}`, {
                method: 'PATCH',
                headers: getHeaders('return=representation'),
                body: JSON.stringify(payload)
            });
            if (fetchRes.ok) {
                const rows = await fetchRes.json();
                const prod = parseRows(rows)[0] || { ...payload, id: numId };
                return res.status(200).json({ success: true, product: prod });
            }
            const errText = await fetchRes.text();
            return res.status(fetchRes.status).json({ error: errText });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'DELETE') {
        if (!SUPABASE_KEY) return res.status(503).json({ error: 'Falta SUPABASE_ANON_KEY' });
        try {
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${numId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (fetchRes.ok) {
                return res.status(200).json({ success: true, id: numId });
            }
            const errText = await fetchRes.text();
            return res.status(fetchRes.status).json({ error: errText });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
};
