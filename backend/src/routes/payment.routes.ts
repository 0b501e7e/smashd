import { Router } from 'express';
import { paymentController } from '../controllers';

const router = Router();

// Payment and checkout routes
router.post('/initiate-checkout', paymentController.initiateCheckout);
router.get('/checkouts/:checkoutId/status', paymentController.getCheckoutStatus);
router.get('/checkout-url/:checkoutId', paymentController.getCheckoutUrl);

export default router; 