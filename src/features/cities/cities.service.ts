import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CityRecordDTO } from './DTO/city-record-dto.interface';

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCities(query?: string): Promise<CityRecordDTO[]> {
    const where = query
      ? { city_ascii: { contains: query.trim() } }
      : undefined;

    const cities = await this.prisma.city.findMany({
      where,
      orderBy: { city_ascii: 'asc' },
    });

    if (cities.length === 0) {
      throw new NotFoundException('No cities found for the requested query');
    }

    return cities.map((city) => ({
      real_name: city.city,
      ascii_name: city.city_ascii,
      country: city.country,
    }));
  }

  /**
   * Seed the cities table from CSV data.
   * Call this once (e.g. via a CLI command or on startup).
   */
  async seedCities(cityRecords: { city: string; city_ascii: string; lat: number; lng: number; country: string; iso2: string; iso3: string; admin_name: string; capital: string; population?: number }[]): Promise<number> {
    const count = await this.prisma.city.count();
    if (count > 0) {
      return count; // already seeded
    }

    const batch = await this.prisma.city.createMany({
      data: cityRecords,
    });
    return batch.count;
  }
}