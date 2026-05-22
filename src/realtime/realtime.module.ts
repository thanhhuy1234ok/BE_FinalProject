import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
    providers: [RealtimeGateway, RealtimeService],
    imports: [JwtModule.register({})],
    exports: [RealtimeGateway],
})
export class RealtimeModule {}
