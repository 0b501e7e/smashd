import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { IAuthService } from '../interfaces/IAuthService';
import { MenuService } from '../services/menu.service';
import { NotificationService } from '../services/notification.service';
import { OrderService } from '../services/order.service';
import { UserService } from '../services/user.service';
import { AdminService } from '../services/admin.service';
import { PaymentService } from '../services/payment.service';
import { DriverService } from '../services/driver.service';
import { IDriverService } from '../interfaces/IDriverService';
import { AnalyticsService } from '../services/analytics.service';
import { IAnalyticsService } from '../interfaces/IAnalyticsService';

/**
 * Service Container - Centralized dependency injection
 * 
 * This class manages all service instances and their dependencies.
 * Benefits:
 * - Single database connection (instead of 5+ connections)
 * - Centralized service management
 * - Better memory usage (service reuse)
 * - Easier testing (can inject mocks)
 * - Industry standard pattern
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private _prisma: PrismaClient;
  private _authService: IAuthService;
  private _menuService: MenuService;
  private _notificationService: NotificationService;
  private _orderService: OrderService;
  private _userService: UserService;
  private _adminService: AdminService;
  private _paymentService: PaymentService;
  private _driverService: IDriverService;
  private _analyticsService: IAnalyticsService;

  private constructor() {
    console.log('🔧 Initializing Service Container...');

    // Create single database connection
    this._prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Initialize services with dependency injection
    this._analyticsService = new AnalyticsService(this._prisma);
    this._authService = new AuthService(this._prisma);
    this._menuService = new MenuService(this._prisma);
    this._notificationService = new NotificationService(this._prisma);
    this._orderService = new OrderService(this._prisma, this._analyticsService);
    this._userService = new UserService(this._prisma);
    this._adminService = new AdminService(this._prisma, this._orderService, this._notificationService);
    this._paymentService = new PaymentService(this._prisma);
    this._driverService = new DriverService(this._prisma, this._orderService, this._notificationService);

    console.log('✅ Service Container initialized successfully');
  }

  /**
   * Singleton pattern - ensures only one service container exists
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Get database client
   */
  public get prisma(): PrismaClient {
    return this._prisma;
  }

  /**
   * Get authentication service
   */
  public get authService(): IAuthService {
    return this._authService;
  }

  /**
   * Get menu service
   */
  public get menuService(): MenuService {
    return this._menuService;
  }

  /**
   * Get notification service
   */
  public get notificationService(): NotificationService {
    return this._notificationService;
  }

  /**
   * Get order service
   */
  public get orderService(): OrderService {
    return this._orderService;
  }

  /**
   * Get user service
   */
  public get userService(): UserService {
    return this._userService;
  }

  /**
   * Get admin service
   */
  public get adminService(): AdminService {
    return this._adminService;
  }

  /**
   * Get payment service
   */
  public get paymentService(): PaymentService {
    return this._paymentService;
  }

  /**
   * Get driver service
   */
  public get driverService(): IDriverService {
    return this._driverService;
  }

  /**
   * Get analytics service
   */
  public get analyticsService(): IAnalyticsService {
    return this._analyticsService;
  }

  /**
   * Graceful shutdown - closes database connection
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Service Container...');
    await this._prisma.$disconnect();
    console.log('✅ Service Container shutdown complete');
  }
}

/**
 * Export singleton instance for easy access
 */
export const services = ServiceContainer.getInstance(); 