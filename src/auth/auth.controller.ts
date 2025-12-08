import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { Public, ResponseMessage, User } from 'src/helpers/decorator/customize';
import type { Request, Response } from 'express';
import { ChangePasswordAuthDto, ForgotPasswordAuthDto } from './dto/create-user.dto';
import { RolesService } from './../roles/roles.service';
import type { IUser } from 'src/helpers/types/user.interface';
import { ThrottlerGuard } from '@nestjs/throttler';
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
  handleLogin(@Req() req, @Res({ passthrough: true }) response: Response) {
    const delay = req.body.delay ?? 0; // Use 0 if delay is not provided
    return this.authService.login(req.user, response, delay);
  }

  @ResponseMessage('Get user information')
  @Get('/account')
  async handleGetAccount(@User() user: IUser) {
    try {
      return { user };
    } catch (error) {
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
    const refresh_token = request.cookies['refresh_token'];
    return this.authService.processNewToken(refresh_token, response);
  }

  // @Post('logout')
  // handleLogout(
  //   @Res({ passthrough: true }) response: Response,
  //   @User() user: IUser,
  // ) {
  //   return this.authService.logout(response, user);
  // }

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
