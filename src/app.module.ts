import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './infra/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AiModule } from './modules/ai/ai.module';
import { FastApiModule } from './infra/fastapi/fastapi.module';
import { AuthModule } from './modules/auth/auth.module';
import { NoticeModule } from './modules/notice/notice.module';
import { DeckModule } from './modules/deck/deck.module';
import { PitchModule } from './modules/pitch/pitch.module';
import { RehearsalModule } from './modules/rehearsal/rehearsal.module';
import { QaModule } from './modules/qa/qa.module';
import { ReportModule } from './modules/report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
      { name: 'auth', ttl: 60_000, limit: 10 },
    ]),
    PrismaModule,
    UserModule,
    AiModule,
    FastApiModule,
    AuthModule,
    NoticeModule,
    DeckModule,
    PitchModule,
    RehearsalModule,
    QaModule,
    ReportModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
