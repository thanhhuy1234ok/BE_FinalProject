import { Controller, Get, Post } from '@nestjs/common';
import { MailService } from './mail.service';

import { MailerService } from '@nestjs-modules/mailer';
import { Public, ResponseMessage } from '@/helpers/decorator/customize';

@Controller('mail')
export class MailController {
    constructor(
        private readonly mailService: MailService,
        private mailerService: MailerService,
    ) {}

    @Get()
    @Public()
    @ResponseMessage('test mail')
    async handleTestEmail() {
        await this.mailerService.sendMail({
            to: 'nguyenvothanhhuy2002@gmail.com',
            from: '"Support Team" <support@example.com>', // override default from
            subject: 'Welcome to Nice App! Confirm your Email',
            template: 'test',
            // context: {
            //   name: user.name,
            //   activationCode: codeId,
            // },
        });
    }
}
