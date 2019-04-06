import * as knex from 'knex';
import { DBQueryResult } from 'wraps-base';

import { cache } from './cache';
import { db } from './db';
import { logger } from './logger';
import { parseSelectFilters } from './ModelFilters';
import { getModelMetadata } from './modelMetadata';

import {
  DeleteValues,
  InsertValues,
  Metadata,
  SelectFilterPredicate,
  SelectFilters,
  SelectFiltersList,
  SQLDeleteReturnData,
  SQLInsertReturnData,
  SQLSelectReturnData,
  SQLUpdateReturnData,
  UpdateValues,
} from './interfaces';

interface ModelGlobals {
  [name: string]: string;
}

export class Model {
  public globals: ModelGlobals;
  public strictMode: boolean = false;

  private lastError: any;
  private metadata: Metadata;
  private modelName: string;

  constructor(modelName: string, globals?: ModelGlobals) {
    this.modelName = modelName;
    this.globals = globals;
  }

  public getMetadata(): Metadata {
    return this.metadata;
  }

  public async init(): Promise<Model> {
    this.metadata = await cache.getObjKey('model', this.modelName);
    if (!this.metadata) {
      logger.debug(`Model cache miss for model "${this.modelName}". Fetching database metadata...`);
      this.metadata = await getModelMetadata(this.modelName);
      this.saveMetadataToCache(this.metadata);
    }
    return this;
  }

  public async select(filters?: string | SelectFilters | SelectFiltersList): Promise<SQLSelectReturnData> {
    const sql = db.sql
      .select(this.metadata.columns.map(col => `${col.columnName} as ${col.field}`))
      .from(this.dbQueryTable);
    if (filters) parseSelectFilters(filters).map(cur => this.createSqlFilter(sql, cur));
    logger.debug('Running database query...', sql.toString());
    const dbResult: DBQueryResult = await db.query(sql);
    logger.silly('Row count: ', dbResult.rowCount);
    logger.silly('DB Result: ', dbResult.rows);
    return {
      data: dbResult.rows,
      rows: dbResult.rowCount,
    };
  }

  public async insert(values: InsertValues): Promise<SQLInsertReturnData> {
    const sql = db.sql.insert(this.translateModelFields(values), '*').into(this.dbTable);
    logger.debug('Inserting into database...');
    const dbResult = await db.query(sql);
    logger.silly('DB Result: ', dbResult.rows);
    return {
      data: dbResult.rows[0],
    };
  }

  public async update(values: UpdateValues): Promise<SQLUpdateReturnData> {
    const sql = db
      .sql(this.dbTable)
      .update(this.translateModelFields(values.newValues), '*')
      .where(this.translateModelFields(values.oldValues));
    logger.debug('Updating database row...');
    const dbResult: DBQueryResult = await this.executeTransaction(sql);
    logger.silly('DB Result: ', dbResult);
    return {
      data: dbResult.rows[0],
      found: dbResult.rowCount > 0,
    };
  }

  public async delete(values: DeleteValues): Promise<SQLDeleteReturnData> {
    const sql = db
      .sql(this.dbTable)
      .delete('*')
      .where(this.translateModelFields(values));
    logger.debug('Deleting database row...');
    const dbResult: DBQueryResult = await this.executeTransaction(sql);
    logger.silly('DB Result: ', dbResult);
    return {
      data: dbResult.rows[0],
      found: dbResult.rowCount > 0,
    };
  }

  private async saveMetadataToCache(metadata: Metadata) {
    await cache.saveKey('model', this.modelName, metadata);
  }

  private get dbQueryTable(): knex.Raw | string {
    logger.silly('Raw query: ', `(${this.metadata.sql}) as qry`);
    logger.silly('Globals: ', this.globals);
    logger.silly('SQL: ', db.sql.raw(`(${this.metadata.sql}) as qry`, this.globals).toString());
    if (this.metadata.sql) return db.sql.raw(`(${this.metadata.sql}) as qry`, this.globals); // `(${this.metadata.sql}) as qry`;
    return this.dbTable;
  }
  private get dbTable() {
    if (this.metadata.schema) return `${this.metadata.schema}.${this.metadata.table.toLowerCase()}`;
    return this.metadata.table.toLowerCase();
  }

  private createSqlFilter(sql: knex.QueryBuilder, filter: SelectFilterPredicate) {
    let val: knex.Raw;
    let filterColumn: string;
    if (this.metadata.fieldList[filter.column]) filterColumn = this.metadata.fieldList[filter.column].columnName;
    else filterColumn = filter.column;
    // IMPORTANT TODO HERE:
    // Raw values in knex can lead to SQL Injection attacks. Modify this to bind value variable
    if (filter.function) val = db.sql.raw(`${filter.function}('${filter.value}')`);

    if (filter.operator === 'IN') return sql.whereIn(filterColumn, filter.multipleValues || [val || filter.value]);
    if (filter.operator === 'NOT IN')
      return sql.whereNotIn(filterColumn, filter.multipleValues || [val || filter.value]);
    if (filter.operator === 'BETWEEN')
      return sql.whereBetween(filterColumn, [filter.multipleValues[0], filter.multipleValues[1]]);
    if (filter.operator === 'NOT BETWEEN')
      return sql.whereNotBetween(filterColumn, [filter.multipleValues[0], filter.multipleValues[1]]);
    if (filter.operator === 'IS NULL') return sql.whereNull(filterColumn);
    if (filter.operator === 'IS NOT NULL') return sql.whereNotNull(filterColumn);
    return sql.where(filterColumn, filter.operator, val || filter.value);
  }

  private async executeTransaction(sql: knex.QueryBuilder): Promise<DBQueryResult> {
    const transaction = await db.getTransaction();
    const dbResult: DBQueryResult = await db.query(sql, transaction);
    // Check return results for update
    // If more than one row were updated return an error
    if (dbResult.rowCount > 1) {
      transaction.client.query('ROLLBACK');
      throw new Error('ERRMORETHAN1ROWUPDATED');
    }

    transaction.client.query('COMMIT');
    return dbResult;
  }

  private translateModelFields(fields: { [name: string]: any }): { [name: string]: any } {
    if (this.strictMode || this.metadata.columns.length === 0) return fields;

    const dbFields: { [name: string]: any } = {};
    if (!fields) return dbFields;

    this.metadata.columns
      .filter(col => fields.hasOwnProperty(col.field))
      .map((col) => dbFields[col.columnName || col.field] = fields[col.field]);

    return dbFields;
  }

}

export async function getModel(modelName: string, globals?: ModelGlobals) {
  return new Model(modelName, globals).init();
}
