import express, { Request, Response } from 'express';
import { expirePoints, handleBirthdayRewardsAndAnnualReset } from '../jobs/loyaltyCron';

const router = express.Router();

/**
 * Middleware to protect cron routes
 * Requires a CRON_SECRET environment variable
 */
const authenticateCron = (req: Request, res: Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    // Access environment variable with bracket notation if needed, or stick to dot if configured
    const cronSecret = process.env['CRON_SECRET'];

    // Ideally, use a strong secret. 
    if (!cronSecret) {
        console.warn('CRON_SECRET is not set. Cron routes are unprotected!');
    }

    // Check for Bearer token or exact match
    if (authHeader === `Bearer ${cronSecret}` || req.query['secret'] === cronSecret) {
        next();
        return;
    }

    res.status(401).json({ error: 'Unauthorized' });
};

// Route: POST /v1/cron/loyalty
// Description: Triggers the daily loyalty points expiration and birthday rewards check
// Intended to be called by an external scheduler (Vercel Cron, GitHub Actions)
router.post('/loyalty', authenticateCron, async (_req: Request, res: Response) => {
    try {
        console.log('Received external cron trigger for loyalty tasks');

        // Run tasks sequentially
        await expirePoints();
        await handleBirthdayRewardsAndAnnualReset();

        res.json({
            success: true,
            message: 'Loyalty cron tasks completed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error executing loyalty cron tasks:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
