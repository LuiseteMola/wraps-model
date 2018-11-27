import { SelectFilterPredicate, SelectFilters, SelectFiltersList } from './interfaces';

import { logger } from './logger';

export function parseSelectFilters(filters: string | SelectFilters | SelectFiltersList): SelectFiltersList {
    let filterList: SelectFilters | SelectFiltersList;
    logger.debug('Parsing filters: ', filters);
    // String filter parameter. Create predicate list
    if (typeof (filters) === 'string') filterList = createPredicateFromString(filters);
    else filterList = filters;

    // Parameter is an array. Format predicates
    if (Array.isArray(filterList)) return filterList.map((cur) => createFilterPredicate(cur));

    // Parameter is an object. Create array and format predicates
    const filterArray: SelectFiltersList = [];
    for (const i in filterList) {
        if (filterList.hasOwnProperty(i)) filterArray.push(createFilterPredicate(filterList[i], i));
    }
    return filterArray;
}

function createPredicateFromString(filter: string) {
    const parsedFilter = JSON.parse(filter);
    return parsedFilter;
}

function createFilterPredicate(filter: string | SelectFilterPredicate, columnName?: string): SelectFilterPredicate {
    // Filter is a string. Exact match
    if (typeof (filter) === 'string') return {
        column: columnName,
        operator: '=',
        value: filter,
    };
    // Filter is an already created predicate
    if ('value' in filter || 'multipleValues' in filter || 'operator' in filter) {
        if (!filter.column) filter.column = columnName;
        if (!filter.operator) filter.operator = '=';
        return filter;
    }
    throw new Error('ERRINVALIDMODELFILTER');
}
