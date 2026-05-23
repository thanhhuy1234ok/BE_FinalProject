import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateInfoDto {
  @IsOptional()
  id: string;

  @IsNotEmpty()
  data: Record<string, any>; // Data being updated

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  status?: string;
}

export class ApproveRequestDto {
  id: string; // ID của yêu cầu cập nhật
}
