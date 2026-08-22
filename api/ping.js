const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vxswjaixnlfwgtqrwcf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let supabaseStatus = 'no_configurado';
    if (SUPABASE_KEY) {
        try {
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=id&limit=1`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                cache: 'no-store'
            });
            supabaseStatus = fetchRes.ok ? 'conectado' : `error: ${fetchRes.status}`;
        } catch (e) {
            supabaseStatus = `error: ${e.message}`;
        }
    }

    return res.status(200).json({
        status: 'ok',
        provider: 'supabase',
        supabase_url: SUPABASE_URL,
        supabase_status: supabaseStatus
    });
};
