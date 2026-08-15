/**
 * SynthDB - Docker Environment & Entrypoint Scaffolder
 * Generates docker-compose.yml and pre-seeded /docker-entrypoint-initdb.d/ initialization scripts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SchemaIR, TableDataset, Dialect } from '../types';
import { SqlBatchExporter } from './SqlBatchExporter';

export class DockerScaffolder {
  /**
   * Scaffolds docker compose environment and entrypoint SQL file.
   */
  public static scaffold(
    outputDir: string,
    schema: SchemaIR,
    datasets: Map<string, TableDataset>,
    dialect: Dialect = 'postgres'
  ): { composeFile: string; initSqlFile: string } {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const initDbDir = path.join(outputDir, 'docker-entrypoint-initdb.d');
    if (!fs.existsSync(initDbDir)) {
      fs.mkdirSync(initDbDir, { recursive: true });
    }

    // 1. Generate init SQL
    const initSqlFile = path.join(initDbDir, '01_synthdb_seed.sql');
    SqlBatchExporter.exportToFile(initSqlFile, schema, datasets, dialect);

    // 2. Generate docker-compose.yml
    const composeContent = this.generateComposeYaml(dialect);
    const composeFile = path.join(outputDir, 'docker-compose.yml');
    fs.writeFileSync(composeFile, composeContent, 'utf8');

    return { composeFile, initSqlFile };
  }

  private static generateComposeYaml(dialect: Dialect): string {
    if (dialect === 'mysql') {
      return `version: '3.8'

services:
  synthdb-mysql:
    image: mysql:8.0
    container_name: synthdb-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: synthdb
      MYSQL_USER: synthuser
      MYSQL_PASSWORD: synthpassword
    ports:
      - "3306:3306"
    volumes:
      - ./docker-entrypoint-initdb.d:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]
      interval: 5s
      timeout: 5s
      retries: 10
`;
    }

    // Default PostgreSQL
    return `version: '3.8'

services:
  synthdb-postgres:
    image: postgres:16-alpine
    container_name: synthdb-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: synthdb
      POSTGRES_USER: synthuser
      POSTGRES_PASSWORD: synthpassword
    ports:
      - "5432:5432"
    volumes:
      - ./docker-entrypoint-initdb.d:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U synthuser -d synthdb"]
      interval: 5s
      timeout: 5s
      retries: 10
`;
  }
}
