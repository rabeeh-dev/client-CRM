require('dotenv').config({ override: true });
const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
