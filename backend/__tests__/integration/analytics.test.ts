import request from 'supertest';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock the entire Prisma client but preserve enums
jest.mock('@prisma/client', () => {
    const actualPrisma = jest.requireActual('@prisma/client');
    return {
        ...actualPrisma,
        PrismaClient: jest.fn().mockImplementation(() => ({
            user: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
            },
            order: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
            weeklyAnalytics: {
                findUnique: jest.fn(),
                upsert: jest.fn(),
                findMany: jest.fn(),
            },
            analyticsEvent: {
                create: jest.fn(),
            },
            menuItem: {
                findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
            $connect: jest.fn(),
            $disconnect: jest.fn(),
        })),
    };
});

import { app } from '../../src/server';
import { services } from '../../src/config/services';
import { Role } from '@prisma/client';

const mockedPrisma = services.prisma as any;

describe('Analytics Integration Tests', () => {
    let adminToken: string;
    let customerToken: string;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockedBcrypt.compare.mockResolvedValue(true as never);

        // Mock admin user
        mockedPrisma.user.findUnique.mockImplementation((query: any) => {
            if (query.where?.email === 'admin@example.com') {
                return Promise.resolve({ id: 1, email: 'admin@example.com', role: Role.ADMIN });
            }
            if (query.where?.email === 'customer@example.com') {
                return Promise.resolve({ id: 2, email: 'customer@example.com', role: Role.CUSTOMER });
            }
            return Promise.resolve(null);
        });

        const adminLogin = await request(app)
            .post('/v1/auth/login')
            .send({ email: 'admin@example.com', password: 'password' });
        adminToken = adminLogin.body.data.token;

        const customerLogin = await request(app)
            .post('/v1/auth/login')
            .send({ email: 'customer@example.com', password: 'password' });
        customerToken = customerLogin.body.data.token;
    });

    describe('GET /analytics/current-week', () => {
        it('should return current week analytics and trigger generation if missing', async () => {
            const mockAnalytics = {
                weekStartDate: new Date(),
                totalRevenue: 100,
                metadata: { dataGeneratedAt: new Date() }
            };

            mockedPrisma.weeklyAnalytics.findUnique.mockResolvedValue(null);
            mockedPrisma.order.findMany.mockResolvedValue([]);
            mockedPrisma.weeklyAnalytics.upsert.mockResolvedValue(mockAnalytics);

            const response = await request(app)
                .get('/v1/analytics/current-week')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockedPrisma.weeklyAnalytics.upsert).toHaveBeenCalled();
        });

        it('should force refresh if query param is set', async () => {
            const staleDate = new Date(Date.now() - 10 * 60 * 1000); // 10 mins ago
            const mockAnalytics = {
                weekStartDate: new Date(),
                totalRevenue: 100,
                metadata: { dataGeneratedAt: staleDate }
            };

            mockedPrisma.weeklyAnalytics.findUnique.mockResolvedValue(mockAnalytics);
            mockedPrisma.order.findMany.mockResolvedValue([]);
            mockedPrisma.weeklyAnalytics.upsert.mockResolvedValue({
                ...mockAnalytics,
                metadata: { dataGeneratedAt: new Date() }
            });

            const response = await request(app)
                .get('/v1/analytics/current-week?refresh=true')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockedPrisma.weeklyAnalytics.upsert).toHaveBeenCalled();
        });

        it('should refresh range analytics if refresh flag is set', async () => {
            mockedPrisma.weeklyAnalytics.findMany.mockResolvedValue([]);
            mockedPrisma.weeklyAnalytics.upsert.mockResolvedValue({
                weekStartDate: new Date(),
                totalRevenue: 0,
                metadata: { dataGeneratedAt: new Date() }
            });

            const response = await request(app)
                .get('/v1/analytics/revenue?refresh=true')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockedPrisma.weeklyAnalytics.upsert).toHaveBeenCalled();
        });
    });

    describe('Order Event Tracking', () => {
        it('should track order_placed event when order is verified', async () => {
            const mockOrder = {
                id: 123,
                userId: 2,
                total: 50,
                status: 'AWAITING_PAYMENT',
                sumupCheckoutId: 'checkout_123',
                items: []
            };

            mockedPrisma.order.findFirst.mockResolvedValue(mockOrder);
            mockedPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'PAYMENT_CONFIRMED' });
            mockedPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, items: [] });

            // Mock tracking call
            mockedPrisma.analyticsEvent.create.mockResolvedValue({});

            await request(app)
                .post('/v1/orders/123/verify-payment')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            // Verify trackOrderPlaced was called (which calls trackEvent -> analyticsEvent.create)
            expect(mockedPrisma.analyticsEvent.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        eventType: 'order_placed',
                        metadata: expect.objectContaining({
                            orderId: 123
                        })
                    })
                })
            );
        });
    });
});
