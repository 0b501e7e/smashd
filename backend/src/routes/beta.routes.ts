import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

const router = express.Router();

/**
 * POST /v1/beta/signup
 * Save beta tester interest
 */
router.post(
    '/signup',
    [
        body('email').isEmail().withMessage('Please provide a valid Gmail address'),
        body('name').isString().notEmpty().withMessage('Name is required'),
        body('platform').isIn(['android', 'ios']).withMessage('Platform must be android or ios')
    ],
    async (req: Request, res: Response) => {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return; // Ensure we return void
        }

        try {
            const { email, name, platform } = req.body;

            // In a "Real" production app, we would save this to a database model (e.g. BetaTester)
            // For this "Lean/One-Dev" phase, we will just LOG it clearly so the dev can copy-paste.
            // We can also append to a simple file if needed, but logging is safest for stateless deployments (Railway/Fly)

            console.log('\n==================================================');
            console.log('🚀 NEW BETA TESTER SIGNUP');
            console.log(`📧 Email: ${email}`);
            console.log(`👤 Name: ${name}`);
            console.log(`📱 Platform: ${platform}`);
            console.log(`📅 Date: ${new Date().toISOString()}`);
            console.log('==================================================\n');

            // TODO: If you want to persist this, uncomment the Prisma code below when model exists
            /*
            await prisma.betaTester.create({
              data: { email, name, platform }
            });
            */

            res.status(201).json({
                success: true,
                message: 'Thanks for signing up! We will send you an invite shortly.'
            });
        } catch (error) {
            console.error('Error processing beta signup:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
);

export default router;
