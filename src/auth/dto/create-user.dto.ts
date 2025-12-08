import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class ForgotPasswordAuthDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsNotEmpty({ message: 'password không được để trống' })
  password: string;

  @IsNotEmpty({ message: 'code không được để trống' })
  code: string;
  @IsNotEmpty({ message: 'confirmPassword không được để trống' })
  confirmPassword: string;
}

export class ChangePasswordAuthDto {
  @IsNotEmpty({ message: 'code không được để trống' })
  code: string;
  @IsNotEmpty({ message: 'password không được để trống' })
  oldPassword: string;

  @IsNotEmpty({ message: 'password không được để trống' })
  password: string;

  @IsNotEmpty({ message: 'confirmPassword không được để trống' })
  confirmPassword: string;
}