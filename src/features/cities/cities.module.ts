import { Module } from '@nestjs/common';
import { CsvService } from '../../common/csv/csv.service';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';

@Module({
  controllers: [CitiesController],
  providers: [CitiesService, CsvService],
  exports: [CitiesService],
})
export class CitiesModule {}
