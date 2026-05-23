import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { IUser } from '@/helpers/types/user.interface';
import { RolesService } from '@/roles/roles.service';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private rolesService: RolesService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>(
                'JWT_ACCESS_TOKEN_SECRET',
            ),
        });
    }

    async validate(payload: IUser) {
        const { id, name, email, role_id } = payload;
        const temp = await this.rolesService.findOne(role_id);
        if (!temp) {
            throw new Error('Role không tồn tại');
        }
        return {
            id,
            name,
            email,
            role: { id: temp.id, name: temp.name },
            // permissions: temp?.permissions ?? [],
        };
    }
}
