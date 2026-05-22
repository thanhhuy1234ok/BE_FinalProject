import { PartialType } from '@nestjs/mapped-types';
import { CreateChatAppDto } from './create-chat-app.dto';

export class UpdateChatAppDto extends PartialType(CreateChatAppDto) {}
