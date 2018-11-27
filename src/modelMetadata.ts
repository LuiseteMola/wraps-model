import { db } from './db';
import { Metadata, MetadataColumns, MetadataField } from './interfaces';
import { logger } from './logger';

async function getFieldsMetadata(modelName: string): Promise<MetadataColumns> {
    const sql = db.sql.select().from('models_det')
        .where({ id_model: modelName.toUpperCase() });
    const result = await db.query(sql);
    return result.rows.map((row: any) => {
        return {
            baseTable: row.base_table === 'Y',
            columnName: row.column_name || row.field,
            defaultValue: row.default_value,
            field: row.field,
            maxLength: row.length,
            primaryKey: row.primary_key === 'Y',
            required: (row.required === 'Y'),
            type: row.type,
            uppercase: row.uppercase === 'Y',
        } as MetadataField;
    });
}


async function getHeaderMetadata(modelName: string): Promise<Metadata> {
    logger.silly('Get Header metadata');
    const sql = db.sql.select().from('models')
        .where({ id_model: modelName.toUpperCase() });
    let result;
    try {
        result = await db.query(sql);
    }
    catch (err) {
        if (err.code === '42P01') {
            logger.error('MODEL database tables are not configured. Please create MODELS and MODELS_DET table on your database');
            throw new Error('ERRMODELNOTCONFIGURED');
        }
        logger.error('Unhandled error when looking for model tables:');
        logger.error('Code: ', err.code);
        logger.error('Stack: ', err);
        throw err;
    }
    logger.silly('Fetch model query result: ', result);
    if (result.rowCount === 0) throw new Error('ERRMODELNOTFOUND');
    const row = result.rows[0];
    return {
        columns: [],
        fieldList: {},
        permissions: {
            delete: row.del === 'Y',
            insert: row.ins === 'Y',
            select: row.sel === 'Y',
            update: row.upd === 'Y',
        },
        primaryKey: [],
        rowLimit: row.row_limit,
        schema: row.schema_name,
        sql: row.sql,
        table: row.table_name,
    };
}

export async function getModelMetadata(modelName: string): Promise<Metadata> {
    const metadata: Metadata = await getHeaderMetadata(modelName);
    metadata.columns = await getFieldsMetadata(modelName);
    metadata.columns.map((column) => metadata.fieldList[column.field] = column);
    metadata.primaryKey = metadata.columns.filter((column) => column.primaryKey).map((column) => column.field);
    return metadata;
}