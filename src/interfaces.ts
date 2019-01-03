export interface MetadataField {
  /** Field name. Can be table column name or another identifier */
  field: string;
  /** Field type */
  type: string;
  required: boolean;
  /** Tells whether this column belongs to base table or from an sql expression */
  baseTable: boolean;
  /** Database column name. If not provided it will be equal as field */
  columnName: string;
  /** Field max length */
  maxLength?: number;
  /** This field belongs to table primary key? */
  primaryKey: boolean;
  /** This field should be always on uppercase (informative for frontend) */
  uppercase: boolean;
  /** Model field default value */
  defaultValue: string;
}

export type MetadataColumns = Array<MetadataField>;
export interface MetadataFieldList {
  [fieldName: string]: MetadataField;
}

export interface Metadata extends ModelMetadata{
  /** Base table schema */
  schema?: string;
  /** Model table for data operations (insert/update/delete). It will be used for select when sql is not provided */
  table: string;
  /** SQL used for query */
  sql: string;
}

export interface ModelMetadata {
  /** Model permissions (select/insert/update/delete) */
  permissions: {
    select: boolean;
    insert: boolean;
    delete: boolean;
    update: boolean;
  };
  /** Array of model columns */
  columns: MetadataColumns;
  /** Field list direct access */
  fieldList: MetadataFieldList;
  /** Fetch row limit */
  rowLimit?: number;
  /** Primary key field list. Used for update/delete */
  primaryKey: Array<string>;
}

export type SQLOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN'
  | 'NOT BETWEEN'
  | 'IS NULL'
  | 'IS NOT NULL';

export interface SelectFilterPredicate {
  /** Query filter column name */
  column?: string;
  /** Query filter value */
  value?: string;
  /** Query operator. Defaults to = */
  operator?: SQLOperator;
  function?: string;
  multipleValues?: Array<string>;
}

export type SelectFiltersList = Array<SelectFilterPredicate>;

export interface SelectFilters {
  [fieldName: string]: string | SelectFilterPredicate;
}

export type InsertValues = any;

export interface ValueList {
  [fieldName: string]: string | number | boolean | null;
}

export interface UpdateValues {
  oldValues: ValueList;
  newValues: ValueList;
}

export type DeleteValues = ValueList;

export interface SQLSelectReturnData {
  rows: number;
  data: Array<any>;
}

export interface SQLInsertReturnData {
  data: any;
}

export interface SQLUpdateReturnData {
  found: boolean;
  data: ValueList;
}

export interface SQLDeleteReturnData {
  found: boolean;
  data: DeleteValues;
}
