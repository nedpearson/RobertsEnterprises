async function paginate(knex, queryBuilder, page = 1, limit = 50) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(250, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  // Get total count using a subquery wrapper to handle group by, select, joins correctly
  const totalQuery = knex.count('* as total').from(queryBuilder.clone().as('subquery'));
  const countResult = await totalQuery;
  const total = parseInt(countResult[0]?.total || 0);

  const data = await queryBuilder.limit(limitNum).offset(offset);
  const pages = Math.ceil(total / limitNum);

  return {
    data,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      pages,
      hasNextPage: pageNum < pages,
      hasPreviousPage: pageNum > 1
    }
  };
}

module.exports = { paginate };
