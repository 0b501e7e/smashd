import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /v1/beta/signup
 * Save beta tester interest
 */
router.post(
    '/signup',
    [
        body('email').isEmail().withMessage('Please provide a valid Gmail address'),
        body('name').isString().notEmpty().withMessage('Name is required'),
        // Platform validation removed
    ],
    async (req: Request, res: Response) => {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const { email, name } = req.body;

            // Check if already exists to return a friendly message
            const existing = await prisma.betaTester.findUnique({
                where: { email }
            });

            if (existing) {
                res.status(200).json({
                    success: true,
                    message: "You're already on the list! Watch your inbox."
                });
                return;
            }

            await prisma.betaTester.create({
                data: { email, name }
            });

            console.log(`🚀 NEW BETA TESTER SAVED: ${email} (${name})`);

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
