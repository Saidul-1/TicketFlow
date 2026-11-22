import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailNotificationListener } from './listeners/email-notification.listener';
import { InAppNotificationListener } from './listeners/in-app-notification.listener';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    EmailNotificationListener,
    InAppNotificationListener,
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
