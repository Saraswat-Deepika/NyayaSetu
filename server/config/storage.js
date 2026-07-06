const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

const storageConfig = {
    Free: {
        maxDocs: parseInt(process.env.LIMIT_FREE_DOCS) || 1000,
        maxSize: (parseInt(process.env.LIMIT_FREE_SIZE_MB) || 5120) * MB
    },
    Student: {
        maxDocs: parseInt(process.env.LIMIT_STUDENT_DOCS) || 2000,
        maxSize: (parseInt(process.env.LIMIT_STUDENT_SIZE_MB) || 10240) * MB
    },
    Premium: {
        maxDocs: parseInt(process.env.LIMIT_PREMIUM_DOCS) || 999999,
        maxSize: (parseInt(process.env.LIMIT_PREMIUM_SIZE_MB) || 51200) * MB
    }
};

const getStorageLimits = (plan = 'Free') => {
    // Standardize plan case to match User model (e.g. Free, Student, Premium)
    const normalizedPlan = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
    return storageConfig[normalizedPlan] || storageConfig['Free'];
};

module.exports = {
    storageConfig,
    getStorageLimits
};
