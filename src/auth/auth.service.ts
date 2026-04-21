import { ConfigService } from '@nestjs/config';
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import ms, { StringValue } from 'ms';
import { Response } from 'express';

import { isValidPassword } from '@/helpers/func/password.util';
import { IUser } from '@/helpers/types/user.interface';
import delay from '@/helpers/func/delay';
import { RolesService } from '@/roles/roles.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private rolesService: RolesService,
    ) {}

    async validateUser(username: string, pass: string) {
        const user = await this.usersService.findOneByUsername(username);
        if (user) {
            const isValid = await isValidPassword(pass, user.password);
            if (isValid === true) {
                // const userRole = user.role;
                // const temp = await this.rolesService.findOne(userRole.id);
                // const objUser = {
                //   ...user,
                //   // permissions: temp?.permissions ?? [],
                // }
                return user;
            }
        }

        return null;
    }

    async login(user: IUser, response: Response, delayMs: number = 0) {
        const { id, name, email, role_id } = user;

        const roles = await this.rolesService.findOne(role_id);
        if (!roles) {
            throw new BadRequestException('Role không tồn tại');
        }
        const payload = {
            sub: 'token login',
            iss: 'from server',
            id,
            name,
            email,
            role_id,
        };

        //set refresh_token cookies
        const refresh_token = this.createRefreshToken(payload);

        await this.usersService.updateUserToken(refresh_token, id);

        response.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            maxAge: ms(
                (this.configService.get<string>(
                    'JWT_REFRESH_EXPIRE',
                ) as StringValue) ?? '7d',
            ),
        });

        if (delayMs > 0) {
            await delay(delayMs);
        }
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id,
                name,
                email,
                role: { id: roles.id, name: roles.name },
                // permissions,
            },
        };
    }

    createRefreshToken = (payload: any) => {
        const refresh_token = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
            expiresIn:
                ms(
                    (this.configService.get<string>(
                        'JWT_ACCESS_EXPIRE',
                    ) as StringValue) ?? '1d',
                ) / 1000,
        });
        return refresh_token;
    };

    processNewToken = async (refreshToken: string, response: Response) => {
        try {
            this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>(
                    'JWT_REFRESH_TOKEN_SECRET',
                ),
            });
            const user = await this.usersService.findUserByToken(refreshToken);

            if (user) {
                const { id, name, email, role, avatar } = user;
                const payload = {
                    sub: 'token refresh',
                    iss: 'from server',
                    id,
                    name,
                    email,
                    role,
                    avatar,
                };

                //set refresh_token cookies
                const refresh_token = this.createRefreshToken(payload);

                await this.usersService.updateUserToken(refresh_token, id);

                // const userRole = user.role as { id: number; name: string };
                // const temp = await this.rolesService.findOne(userRole.id);

                response.clearCookie('refresh_token');

                response.cookie('refresh_token', refresh_token, {
                    httpOnly: true,
                    maxAge: ms(
                        (this.configService.get<string>(
                            'JWT_REFRESH_EXPIRE',
                        ) as StringValue) ?? '7d',
                    ),
                });

                return {
                    access_token: this.jwtService.sign(payload),
                    user: {
                        id,
                        name,
                        email,
                        role,
                        avatar,
                        // permissions: temp?.permissions ?? [],
                    },
                };
            } else {
                throw new BadRequestException(
                    'Refresh Token không hợp lệ. Vui lòng login',
                );
            }
        } catch {
            throw new BadRequestException(
                'Refresh Token không hợp lệ. Vui lòng login',
            );
        }
    };

    logout = async (response: Response, user: IUser) => {
        await this.usersService.updateUserToken('', user.id);
        response.clearCookie('refresh_token');
        return 'ok';
    };

    // verifyCode = async (email: string) => {
    //   return await this.usersService.verifyCode(email);
    // };

    // forgotPassword = async (data: ForgotPasswordAuthDto) => {
    //   return await this.usersService.forgotPassword(data);
    // };

    // changePassword = async (data: ChangePasswordAuthDto, user:IUser) => {
    //   return await this.usersService.changePassword(data, user);
    // }
}
