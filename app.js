// app.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); // For making HTTP requests, e.g., to reCAPTCHA
const path = require('path');

const {sequelize, connectDB} = require('./config/database');


const locationRoutes = require('./routes/locationRoutes');
const indexRouter = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3101;

// Middleware
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Set up static files and view engine (if you're also serving views)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); // Example: Using EJS for templating, similar to Razor views
app.use(express.static(path.join(__dirname, 'public')));

// Synchronize all models (only for development/initial setup)
sequelize.sync({ alter: true }) // `alter: true` updates tables without dropping, use `force: true` to drop and recreate (DANGER!)
    .then(() => {
        console.log('Database synced');
    })
    .catch(err => {
        console.error('Error syncing database:', err);
    });

// Utility function for reCAPTCHA verification
async function verifyReCaptcha(gReCaptchaResponse, clientIpAddress) {
    try {
        const reCaptchaSecret = process.env.GRECAPTCHA_SECRET;
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecret}&response=${gReCaptchaResponse}&remoteip=${clientIpAddress}`;

        const response = await axios.get(verifyUrl);
        return response.data.success;
    } catch (error) {
        console.error("reCAPTCHA verification error:", error);
        return false;
    }
}

// Utility function to resolve IP address
function resolveIpAddress(req) {
    // This is a simplified approach for Express. In production, consider proxy headers.
    return req.ip || req.connection.remoteAddress;
}

// Register API routes
app.use('/', indexRouter);
app.use('/api/locationsearch', locationRoutes);


// Connect to database and start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Access the API at http://localhost:${PORT}/api/locationsearch`);
    });
}).catch(err => {
    console.error('Failed to start server due to database connection error:', err);
});