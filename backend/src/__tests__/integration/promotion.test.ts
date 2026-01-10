import request from 'supertest';
import { app } from '../../server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { APP_CONFIG } from '../../config/constants';

const prisma = new PrismaClient();

const generateToken = (userId: number, email: string, role: string) => {
    return jwt.sign({ userId, email, role }, APP_CONFIG.JWT_SECRET, { expiresIn: '1h' });
};

describe('Promotion Integration Tests', () => {
    let adminToken: string;
    let createdItemId: number;

    beforeAll(async () => {
        // Ensure we have an admin user or just mock the token
        // For simplicity with the existing auth util, we can generate a valid admin token
        // assuming ID 1 is an admin or we can just sign a token with isAdmin: true if the middleware just checks the payload
        // But let's check validation middleware.

        // We'll trust generateToken creates a valid token. 
        // Authenticate token does not check DB, so we can just generate a token.
        // We use a dummy ID.
        adminToken = generateToken(1, 'testadmin@example.com', 'ADMIN');
    });

    afterAll(async () => {
        if (createdItemId) {
            await prisma.menuItem.delete({ where: { id: createdItemId } });
        }
        // Clean up admin user if we created strictly for test? Maybe leave it.
        await prisma.$disconnect();
    });

    describe('POST /v1/admin/menu', () => {
        it('should create a menu item with promotion fields', async () => {
            const newItem = {
                name: 'Promo Burger',
                description: 'A burger on sale',
                price: 10.00, // Sale price
                originalPrice: 15.00, // Regular price
                promotionTitle: 'Launch Deal!',
                vatRate: 0.10,
                category: 'BURGER',
                imageUrl: 'http://example.com/burger.jpg',
                isAvailable: true
            };

            const res = await request(app)
                .post('/v1/admin/menu')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newItem);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(newItem.name);
            expect(res.body.data.originalPrice).toBe(15.00);
            expect(res.body.data.promotionTitle).toBe('Launch Deal!');

            createdItemId = res.body.data.id;
        });
    });

    describe('PUT /v1/admin/menu/:id', () => {
        it('should update promotion fields', async () => {
            const updateData = {
                name: 'Promo Burger Updated',
                description: 'Still on sale',
                price: 12.00,
                originalPrice: 18.00,
                promotionTitle: 'Better Deal',
                vatRate: 0.10,
                category: 'BURGER',
                imageUrl: 'http://example.com/burger.jpg',
                isAvailable: true
            };

            const res = await request(app)
                .put(`/v1/admin/menu/${createdItemId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.originalPrice).toBe(18.00);
            expect(res.body.data.promotionTitle).toBe('Better Deal');
        });

        it('should remove promotion by setting fields to null', async () => {
            // Logic in AdminService or Prisma should handle nulls if we update our type logic correctly
            // Our previous update to AdminService: 
            // originalPrice: menuItemData.originalPrice ?? null

            const removePromoData = {
                name: 'Promo Burger Regular',
                description: 'Not on sale anymore',
                price: 18.00,
                originalPrice: null,
                promotionTitle: null,
                category: 'BURGER',
                imageUrl: 'http://example.com/burger.jpg',
                isAvailable: true
            };

            const res = await request(app)
                .put(`/v1/admin/menu/${createdItemId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(removePromoData);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.originalPrice).toBeNull();
            expect(res.body.data.promotionTitle).toBeNull();
        });
    });
});
