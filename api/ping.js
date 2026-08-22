function getSupabaseUrl(path = '') {
    let baseUrl = (process.env.SUPABASE_URL || 'https://vxswjaixnlfwgtqrwcf.supabase.co').trim().replace(/\/+$/, '');
    if (baseUrl.endsWith('/rest/v1')) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 8).replace(/\/+$/, '');
    }
    return `${baseUrl}/rest/v1${path}`;
}

const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const targetUrl = getSupabaseUrl('/productos?select=id&limit=1');
    let supabaseStatus = 'no_configurado';

    if (SUPABASE_KEY) {
        try {
            const fetchRes = await fetch(targetUrl, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                cache: 'no-store'
            });
            supabaseStatus = fetchRes.ok ? 'conectado' : `error_http_${fetchRes.status}`;
        } catch (e) {
            supabaseStatus = `error_conexion: ${e.message}`;
        }
    }

    return res.status(200).json({
        status: 'ok',
        provider: 'supabase',
        target_url: targetUrl,
        supabase_status: supabaseStatus
    });
};
