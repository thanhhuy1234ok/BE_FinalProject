import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    Render,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { Public, ResponseMessage, User } from '@/helpers/decorator/customize';
import type { Request, Response } from 'express';

import { RolesService } from './../roles/roles.service';
import type { IUser } from '@/helpers/types/user.interface';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private roleService: RolesService,
        // private mailerService: MailerService,
    ) {}

    @Get()
    @Render('home')
    getHello() {
        // return this.appService.getHello();
    }

    @Public()
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @ResponseMessage('user login')
    handleLogin(
        @Req() req: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        const delay = 0;
        if (!req.user) {
            throw new UnauthorizedException(
                'Sai thông tin đăng nhập hoặc chưa được xác thực',
            );
        }

        return this.authService.login(req.user as IUser, response, delay);
    }

    @ResponseMessage('Get user information')
    @Get('/account')
    handleGetAccount(@User() user: IUser) {
        try {
            return { user };
        } catch {
            throw new BadRequestException(
                'Unable to fetch account information. Please try again later.',
            );
        }
    }

    @Public()
    @ResponseMessage('Get User information')
    @Get('refresh')
    handleRefreshToken(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        const refresh_token = request.cookies['refresh_token'] as string;
        return this.authService.processNewToken(refresh_token, response);
    }

    @Post('logout')
    handleLogout(
        @Res({ passthrough: true }) response: Response,
        @User() user: IUser,
    ) {
        return this.authService.logout(response, user);
    }

    // @Public()
    // @Post('retry-password')
    // verifyCode(@Body('email') email: string) {
    //   return this.authService.verifyCode(email);
    // }

    // @Public()
    // @Post('forgot-password')
    // forgotPassword(@Body() data: ForgotPasswordAuthDto) {
    //   return this.authService.forgotPassword(data);
    // }

    // @Post('change-password')
    // changePassword(@Body() changePassword:ChangePasswordAuthDto, @User() user:IUser) {
    //   return this.authService.changePassword(changePassword,user);
    // }

    // @Public()
    // @Get('mail')
    // testMail() {
    //   this.mailerService.sendMail({
    //     to: 'nguyenvothanhhuy2002@gmail.com',
    //     from: '"Support Team" <support@example.com>', // override default from
    //     subject: 'Welcome to Nice App! Confirm your Email',
    //     template: 'code',
    //     context: {
    //       name: 'thanh huy',
    //       activationCode: 123456789,
    //     },
    //   });
    //   return 'ok';
    // }
}
