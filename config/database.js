// config/database.js
const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config(); // Load environment variables from .env file

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mssql', // Or 'postgres', 'mysql', etc.
        dialectOptions: {
            options: {
                encrypt: true, // For Azure SQL Database or if encryption is enabled
                trustServerCertificate: true // Change to false for production if you have a valid SSL certificate
            }
        },
        logging: false // Set to true to see SQL queries in console
    }
);

async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log('Connection to MS SQL Server has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1); // Exit if database connection fails
    }
}


module.exports = {sequelize, connectDB, QueryTypes};