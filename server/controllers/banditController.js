const BanditStat = require('../models/BanditStat');
const QueryFeedback = require('../models/QueryFeedback');
const { recordFeedback } = require('../services/banditService');

const getBanditStats = async (req, res) => {
    try {
        const stats = await BanditStat.find();
        const feedbackCount = await QueryFeedback.countDocuments();
        
        // Calculate totals per arm
        const armStats = {};
        let totalSelectionsAll = 0;
        
        stats.forEach(s => {
            if (!armStats[s.armName]) {
                armStats[s.armName] = { selections: 0, reward: 0, average: 0 };
            }
            armStats[s.armName].selections += s.totalSelections;
            armStats[s.armName].reward += s.totalReward;
            totalSelectionsAll += s.totalSelections;
        });

        Object.keys(armStats).forEach(key => {
            const arm = armStats[key];
            arm.average = arm.selections > 0 ? arm.reward / arm.selections : 0;
            arm.usagePercentage = totalSelectionsAll > 0 ? (arm.selections / totalSelectionsAll) * 100 : 0;
        });

        // Determine best performing strategy per category
        const bestPerCategory = {};
        const categories = ['Property Law', 'Criminal Law', 'Consumer Rights', 'Family Law', 'Employment Law'];
        
        categories.forEach(cat => {
            const catStats = stats.filter(s => s.category === cat);
            let bestArm = 'None';
            let bestReward = -1;
            catStats.forEach(s => {
                if (s.totalSelections > 0 && s.averageReward > bestReward) {
                    bestReward = s.averageReward;
                    bestArm = s.armName;
                }
            });
            bestPerCategory[cat] = { armName: bestArm, averageReward: bestReward === -1 ? 0 : bestReward };
        });

        res.json({
            success: true,
            totalSelections: totalSelectionsAll,
            totalFeedback: feedbackCount,
            armStats,
            bestPerCategory,
            rawStats: stats
        });
    } catch (error) {
        console.error("Error fetching bandit stats:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getBanditStatsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const stats = await BanditStat.find({ category });
        res.json({
            success: true,
            category,
            stats
        });
    } catch (error) {
        console.error("Error fetching category bandit stats:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const submitFeedback = async (req, res) => {
    try {
        const { queryId, feedback } = req.body;
        if (!queryId || !feedback) {
            return res.status(400).json({ success: false, error: "queryId and feedback are required" });
        }
        if (feedback !== 'helpful' && feedback !== 'not-helpful') {
            return res.status(400).json({ success: false, error: "feedback must be 'helpful' or 'not-helpful'" });
        }

        await recordFeedback(queryId, feedback);

        res.json({
            success: true,
            message: "Feedback recorded and bandit statistics updated successfully."
        });
    } catch (error) {
        console.error("Error in submitFeedback controller:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getBanditStats,
    getBanditStatsByCategory,
    submitFeedback
};
