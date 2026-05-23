import { Module } from '@nestjs/common';
import { TermsService } from './terms.service';
import { TermsController } from './terms.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from './entities/term.entity';

@Module({
  controllers: [TermsController],
  providers: [TermsService],
  imports: [TypeOrmModule.forFeature([Term])],
})
export class TermsModule { }
