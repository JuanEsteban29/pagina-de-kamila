const app = require('../server.js');

module.exports = (req, res) => {
    // Normalizar req.url para que Vercel Serverless siempre coincida con las rutas de Express
    if (req.url && !req.url.startsWith('/api')) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
};
