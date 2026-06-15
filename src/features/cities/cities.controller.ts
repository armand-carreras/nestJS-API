import { Controller, Get, Query } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CityRecordDTO } from './DTO/city-record-dto.interface';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  findCities(@Query('q') query?: string): Promise<CityRecordDTO[]> {
    return this.citiesService.getCities(query);
  }

  /* @Get('pairs')
  findCityPairs(
    @Query('q') query?: string,
  ): Promise<Array<{ real_name: string; ascii_name: string }>> {
    return this.citiesService.getCityPairs(query);
  } */
}