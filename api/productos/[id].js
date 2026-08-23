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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

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
        if (!SUPABASE_KEY) return res.status(503).json({ error: 'Falta configurar SUPABASE_ANON_KEY en Vercel' });
        const body = req.body || {};
        const payload = {
            title: body.title,
            price: parseFloat(body.price) || 0,
            category: body.category || 'labios',
            img: body.img || '',
            images: Array.isArray(body.images) ? body.images : [],
            stock: parseInt(body.stock) || 0,
            badge: body.badge || '',
            tones: body.tones || '',
            toneObjects: Array.isArray(body.toneObjects) ? body.toneObjects : [],
            updated_at: new Date().toISOString()
        };

        try {
            // Intento 1: Actualizar fila existente id=eq.numId
            let targetUrl = getSupabaseUrl(`/productos?id=eq.${numId}`);
            let fetchRes = await fetch(targetUrl, {
                method: 'PATCH',
                headers: getHeaders('return=representation'),
                body: JSON.stringify(payload)
            });

            let rows = [];
            if (fetchRes.ok) {
                rows = await fetchRes.json();
            }

            // Intento 2: Si el producto no existía previamente en Supabase, realizar UPSERT/POST guardándolo con su ID
            if (!Array.isArray(rows) || rows.length === 0) {
                const payloadConId = { ...payload, id: numId };
                fetchRes = await fetch(getSupabaseUrl('/productos'), {
                    method: 'POST',
                    headers: getHeaders('resolution=merge-duplicates,return=representation'),
                    body: JSON.stringify(payloadConId)
                });
                if (fetchRes.ok) {
                    rows = await fetchRes.json();
                }
            }

            const prod = (Array.isArray(rows) && rows.length > 0) ? parseRows(rows)[0] : { ...payload, id: numId };
            return res.status(200).json({ success: true, product: prod });
        } catch (e) {
            console.error('[KARA API PUT] Error:', e.message);
            return res.status(500).json({ error: `No se pudo conectar a Supabase: ${e.message}` });
        }
    }

    if (req.method === 'DELETE') {
        if (!SUPABASE_KEY) return res.status(503).json({ error: 'Falta configurar SUPABASE_ANON_KEY en Vercel' });
        try {
            const targetUrl = getSupabaseUrl(`/productos?id=eq.${numId}`);
            const fetchRes = await fetch(targetUrl, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (fetchRes.ok) {
                return res.status(200).json({ success: true, id: numId });
            }
            const errText = await fetchRes.text();
            return res.status(fetchRes.status).json({ error: errText });
        } catch (e) {
            console.error('[KARA API DELETE] Error:', e.message);
            return res.status(500).json({ error: `No se pudo conectar a Supabase: ${e.message}` });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
};
