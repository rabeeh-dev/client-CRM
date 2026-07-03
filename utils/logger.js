const info = (message) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
};

const error = (message) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
};

const debug = (message) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
};

module.exports = {
    info,
    error,
    debug
};
