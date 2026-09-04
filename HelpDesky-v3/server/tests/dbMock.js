// Minimal stand-in for the pg pool. Tests register handlers keyed by a distinctive
// fragment of the SQL they expect; the first match wins, so register specific
// fragments before general ones.
//
// Unmatched queries throw on purpose: a route that reaches the database when a
// guard should have stopped it fails loudly instead of quietly returning [].

const rows = (r) => ({ rows: r, rowCount: r.length });

let handlers = [];

const setHandlers = (next) => {
  handlers = next;
};

const reset = () => {
  handlers = [];
};

const normalize = (sql) => String(sql).replace(/\s+/g, ' ').trim();

const runQuery = async (sql, params = []) => {
  const text = normalize(sql);

  for (const handler of handlers) {
    if (text.includes(handler.match)) {
      return typeof handler.result === 'function' ? handler.result(params, text) : handler.result;
    }
  }

  throw new Error(`No mock DB handler for query: ${text.slice(0, 160)}`);
};

const pool = {
  query: (sql, params) => runQuery(sql, params),
  connect: async () => ({
    query: (sql, params) => {
      const keyword = normalize(sql).toUpperCase();
      if (keyword === 'BEGIN' || keyword === 'COMMIT' || keyword === 'ROLLBACK') {
        return rows([]);
      }
      return runQuery(sql, params);
    },
    release: () => {}
  })
};

module.exports = { pool, setHandlers, reset, rows };
