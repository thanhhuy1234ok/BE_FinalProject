import { IsString } from "class-validator";

export class CreateCampusDto {
    @IsString()
    code: string;
    @IsString()
    name: string;
    @IsString()
    address: string;
}
