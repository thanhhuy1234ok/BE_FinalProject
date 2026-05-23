import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './mail.service';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                transport: {
                    host: configService.get<string>('EMAIL_AUTH_HOST'),
                    port: Number(configService.get<number>('EMAIL_PORT')),
                    secure: false,
                    auth: {
                        user: configService.get<string>('EMAIL_AUTH_USER'),
                        pass: configService.get<string>('EMAIL_AUTH_PASSWORD'),
                    },
                },
                defaults: {
                    from: `"School Management" <${configService.get<string>('MAIL_FROM')}>`,
                },
                template: {
                    dir: join(process.cwd(), 'src/mail/templates'),
                    adapter: new HandlebarsAdapter(),
                    options: {
                        strict: true,
                    },
                },
            }),
        }),
        JwtModule,
    ],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule {}
