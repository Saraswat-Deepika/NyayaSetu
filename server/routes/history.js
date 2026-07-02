const express = require('express');
const router = express.Router();
const {
    getHistory,
    getHistoryById,
    createHistory,
    updateHistory,
    deleteHistory,
    restoreHistory,
    emptyTrash,
    toggleFavorite,
    recordOpen
} = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

// Base path: /api/history

// GET all histories and POST manually create history
router.route('/')
    .get(protect, getHistory)
    .post(protect, createHistory);

// Empty trash (must be declared BEFORE :id routes)
router.delete('/trash/empty', protect, emptyTrash);

// Status toggles/updates
router.patch('/:id/favorite', protect, toggleFavorite);
router.patch('/:id/open', protect, recordOpen);
router.patch('/:id/restore', protect, restoreHistory);

// Single operations: GET detail, PUT update, DELETE history
router.route('/:id')
    .get(protect, getHistoryById)
    .put(protect, updateHistory)
    .delete(protect, deleteHistory);

module.exports = router;
