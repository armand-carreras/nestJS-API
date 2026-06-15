import { Injectable } from '@nestjs/common';
import { parseFile, ParserOptionsArgs } from '@fast-csv/parse';

@Injectable()
export class CsvService {
  async parseFile<T extends Record<string, string>>(
    filePath: string,
    options: ParserOptionsArgs = {},
  ): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      const rows: T[] = [];

      parseFile<T, T>(filePath, {
        headers: true,
        ignoreEmpty: true,
        trim: true,
        ...options,
      })
        .on('error', reject)
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', () => {
          resolve(rows);
        });
    });
  }
}