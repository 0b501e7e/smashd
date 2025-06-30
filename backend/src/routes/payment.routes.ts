import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { services } from '../config/services';

const router = Router();

// Use centralized service container (single DB connection, shared services)
const paymentController = new PaymentController(services.paymentService);

// Payment and checkout routes
router.post('/initiate-checkout', paymentController.initiateCheckout.bind(paymentController));
router.get('/checkouts/:checkoutId/status', paymentController.getCheckoutStatus.bind(paymentController));
router.get('/checkout-url/:checkoutId', paymentController.getCheckoutUrl.bind(paymentController));

// Test routes
router.get('/test/sumup-connection', paymentController.testSumUpConnection.bind(paymentController));
router.get('/test/merchant-profile', paymentController.getMerchantProfile.bind(paymentController));
router.get('/test/check-order/:orderId', paymentController.checkOrderWithSumUp.bind(paymentController));

export default router; 