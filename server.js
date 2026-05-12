const fs = require("fs");
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// 🔥 CORS CONFIGURADO CORRECTAMENTE
app.use(cors({
    origin: "*", // permite cualquier origen (para desarrollo)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
const users = [
    {
        email: "cliente_demo@finova.com",
        password: "123456",
        role: "Cliente"
    },
    {
        email: "cliente_test@finova.com",
        password: "123456",
        role: "Cliente"
    }
];

// LOGIN
app.post('/login', (req, res) => {

    try {

        const { email, password } = req.body;

        const users = JSON.parse(
            fs.readFileSync('./users.json')
        );

        const user = users.find(
            u =>
                u.email === email &&
                u.password === password
        );

        if (!user) {

            return res.status(401).json({
                error: 'Credenciales inválidas'
            });

        }

        res.json({
            success: true,
            email: user.email,
            tenant: user.tenant,
            role: user.role
        });

    }
    catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error login'
        });

    }

});

// Endpoint de prueba
app.get('/', (req, res) => {
    res.send('Backend funcionando correctamente');
});

// 1. Endpoint que genera el Embed Token
app.post('/get-embed-token', async (req, res) => {
    try {

        console.log("📩 Email recibido:", req.body.email);

        // 2. Obtener Access Token desde Entra ID
        const tokenResponse = await axios.post(
            `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                scope: "https://analysis.windows.net/powerbi/api/.default",
                grant_type: "client_credentials"
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // 3. Generar Embed Token
        const embedResponse = await axios.post(
            `https://api.powerbi.com/v1.0/myorg/groups/${process.env.WORKSPACE_ID}/reports/${process.env.REPORT_ID}/GenerateToken`,
            {
                accessLevel: "View",
                identities: [
                    {
                        username: req.body.email,
                        roles: ["Cliente"],
                        datasets: [process.env.DATASET_ID]
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.json({
            embedToken: embedResponse.data.token,
            embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${process.env.REPORT_ID}&groupId=${process.env.WORKSPACE_ID}`,
            reportId: process.env.REPORT_ID
        });

    } catch (error) {
        console.error("❌ ERROR:", error.response?.data || error.message);
        res.status(500).json({
            error: "Error generando token",
            details: error.response?.data || error.message
        });
    }
});

// 4. Iniciar servidor
app.listen(3000, () => {
    console.log("🚀 FINOVA backend corriendo en http://localhost:3000");
});