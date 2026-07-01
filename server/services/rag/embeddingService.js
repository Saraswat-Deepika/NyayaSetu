const { getEmbeddingsModel } = require('../../config/gemini');

const getEmbeddings = () => {
    return getEmbeddingsModel();
};

module.exports = { getEmbeddings };
