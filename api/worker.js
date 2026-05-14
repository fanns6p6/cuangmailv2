// api/worker.js
// Serverless function untuk Vercel - Proxy ke backend utama

const API_KEY = 'sgp_7db3af368a99254fa91b33f6bd14662200bdcae442d44dd9';
const BACKEND_API_URL = 'https://your-backend-api.vercel.app'; // GANTI dengan URL backend asli Anda

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { path } = req.query;
    const apiPath = Array.isArray(path) ? path.join('/') : path || '';
    
    // Endpoints yang tersedia
    const endpoints = {
        'rooms': '/api/external/rooms',
        'generate-emails': '/api/external/generate-emails',
        'deposit': '/api/external/deposit',
        'balance': '/api/external/worker/balance',
        'withdrawals': '/api/external/worker/withdrawals',
        'deposits': '/api/external/worker/deposits',
        'reports': '/api/external/worker/payment-reports',
        'check-acc': '/api/external/worker/check-acc'
    };
    
    // Mapping path ke endpoint
    let targetPath = '';
    for (const [key, endpoint] of Object.entries(endpoints)) {
        if (apiPath.includes(key)) {
            targetPath = endpoint;
            break;
        }
    }
    
    if (!targetPath) {
        // Fallback: langsung pakai path yang diminta
        targetPath = `/api/external/${apiPath}`;
    }
    
    const targetUrl = `${BACKEND_API_URL}${targetPath}`;
    
    try {
        // Forward query params
        const queryParams = new URLSearchParams();
        Object.keys(req.query).forEach(key => {
            if (key !== 'path') {
                queryParams.append(key, req.query[key]);
            }
        });
        
        const finalUrl = queryParams.toString() 
            ? `${targetUrl}?${queryParams.toString()}`
            : targetUrl;
        
        const fetchOptions = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
            },
        };
        
        if (req.method !== 'GET' && req.body) {
            fetchOptions.body = JSON.stringify(req.body);
        }
        
        const response = await fetch(finalUrl, fetchOptions);
        const data = await response.json();
        
        res.status(response.status).json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        
        // Jika backend tidak tersedia, gunakan mock data
        if (apiPath.includes('rooms')) {
            return res.status(200).json({
                rooms: [
                    { id: 'room1', name: 'Task Email Premium', price: 2500, closedAt: new Date().toISOString() },
                    { id: 'room2', name: 'Task Email Reguler', price: 1500, closedAt: new Date(Date.now() - 86400000).toISOString() }
                ]
            });
        }
        
        if (apiPath.includes('balance')) {
            return res.status(200).json({
                worker: { balance: 0, pendingWithdrawals: 0, totalPaidOut: 0, totalDeniedRefunded: 0 }
            });
        }
        
        res.status(500).json({ 
            error: 'Backend tidak tersedia', 
            message: error.message,
            useMockData: true 
        });
    }
}