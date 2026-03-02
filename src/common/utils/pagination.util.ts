import { PaginatedResult } from '../interfaces/paginated.interface';

export function createPaginatedResult<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
): PaginatedResult<T> {
    return {
        items,
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
    };
}
