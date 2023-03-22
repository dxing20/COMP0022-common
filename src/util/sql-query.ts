enum SQLQueryParts {
  FROM = 0, // single
  WHERE, // multiple
  GROUP_BY, // single
  HAVING, // multiple
  SELECT, // single
  ORDER_BY, // single
  LIMIT, // single
}
export enum Compare {
  EQUAL = "=",
  NOT_EQUAL = "!=",
  GREATER_THAN = ">",
  GREATER_THAN_OR_EQUAL = ">=",
  LESS_THAN = "<",
  LESS_THAN_OR_EQUAL = "<=",
  LIKE = "LIKE",
  NOT_LIKE = "NOT LIKE",
}

export enum Order {
  ASC = "ASC",
  DESC = "DESC",
}

export enum Aggregate {
  SUM = "SUM",
  AVG = "AVG",
  MIN = "MIN",
  MAX = "MAX",
  COUNT = "COUNT",
}

// From where groupby having select orderby limit

class SQLQuery {
  public columns: string[] = [];
  public from: {
    join: string | undefined;
    isIndex1: boolean;
    tableName1: string;
    isIndex2: boolean;
    tableName2: string;
    on1: string;
    on2: string;
  };
  public where: { column: string; compare: Compare; value: any }[]; // and >> or >> text
  public groupBy:
    | {
        groupColumn: string;
        aggregateColumn: string;
        aggregate: Aggregate;
      }
    | undefined;
  public having: string[][]; // and >> or >> text
  public orderBy: { order: Order; column: string }[] = [];
  public limit: number;

  public with: { subQuery: SQLQuery }[] = [];

  public currentPart: SQLQueryParts;
  public paramIdCount: number = 1;
  public withIdCount: number = 0;

  constructor(from: {
    join: string | undefined;
    isIndex1: boolean;
    tableName1: string;
    isIndex2: boolean;
    tableName2: string;
    on1: string;
    on2: string;
  }) {
    this.columns = [];
    this.from = from;
    this.where = [];
    this.groupBy = undefined;
    this.having = [];
    this.orderBy = [];
    this.limit = 0;

    this.currentPart = SQLQueryParts.FROM;
  }

  private joinLogicStatements(logicStatements: string[][]): string {
    let ands: string[] = [];
    for (let i = 0; i < logicStatements.length; i++) {
      const ors = logicStatements[i];
      ands.push(`(${ors.join(" OR ")})`);
    }
    return ands.join(" AND ");
  }

  private checkTableName(tableName: string, verifiedTableNames: Set<string>) {
    if (tableName.includes(" ")) {
      throw new Error("Table name cannot contain spaces");
    }
    if (!verifiedTableNames.has(tableName)) {
      throw new Error(`Table name ${tableName} is not verified`);
    }
  }

  public resolve({ verifiedTableNames }: { verifiedTableNames: Set<string> }): {
    text: string;
    params: string[];
  } {
    // const query = `SELECT ${this.columns.join(", ")} FROM ${
    //   this.from
    // } WHERE ${this.joinLogicStatements(this.where)}  GROUP BY ${
    //   this.groupBy
    // } HAVING ${this.joinLogicStatements(
    //   this.having
    // )} ORDER BY ${this.orderBy.join(", ")} LIMIT ${this.limit}`;

    let query: string[] = [];
    let params: string[] = [];

    this.resolveWith(query, params, verifiedTableNames);
    this.resolveSelect(query, params);
    this.resolveFrom(query, params, verifiedTableNames);
    this.resolveWhere(query, params);
    this.resolveOrderBy(query, params);

    return { text: query.join(" "), params: params };
  }

  private resolveFrom(
    query: string[],
    params: string[],
    verifiedTableNames: Set<string>
  ) {
    if (this.from.join) {
      query.push("FROM ");
      if (this.from.isIndex1) {
        query.push(`${this.from.tableName1}`);
      } else {
        this.checkTableName(this.from.tableName1, verifiedTableNames);
        params.push(this.from.tableName1);
      }

      if (
        !["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL JOIN"].includes(
          this.from.join
        )
      ) {
        throw new Error(`Invalid join type ${this.from.join}`);
      }
      query.push(this.from.join);
      if (this.from.isIndex2) {
        query.push(`${this.from.tableName2}`);
      } else {
        this.checkTableName(this.from.tableName2, verifiedTableNames);
        params.push(this.from.tableName2);
      }
      // query.push("ON");
      // query.push(`${this.from.tableName1}.${this.from.on1}`);
      // query.push("=");
      // query.push(`${this.from.tableName2}.${this.from.on2}`);
      query.push(`USING (${this.from.on1})`);
    } else {
      if (this.from.isIndex1) {
        query.push(`FROM ${this.from.tableName1}`);
      } else {
        this.checkTableName(this.from.tableName1, verifiedTableNames);
        query.push(`FROM ${this.from.tableName1}`);
      }
    }
  }

  private resolveWith(
    query: string[],
    parentParams: string[],
    verifiedTableNames: Set<string>
  ) {
    if (this.with.length === 0) return;
    query.push(`WITH`);
    for (let i = 0; i < this.with.length; i++) {
      const withClause = this.with[i];
      const { text, params } = withClause.subQuery.resolve({
        verifiedTableNames,
      });
      query.push(`temp${i} AS (${text})`);
      if (i < this.with.length - 1) query.push(", ");
      parentParams.push(...params);
      this.paramIdCount += params.length;
    }
  }

  private resolveSelect(query: string[], params: string[]) {
    if (this.columns.length === 0) {
      query.push("SELECT *");
    } else if (this.groupBy != undefined) {
      query.push("SELECT ");
      query.push(`$${params.length + 1}`);
      params.push(this.groupBy.groupColumn);
      query.push(", ");
      query.push(this.groupBy.aggregate);
      query.push("(");
      query.push(`$${params.length + 1}`);
      params.push(this.groupBy.aggregateColumn);
      query.push(")");
    } else {
      query.push("SELECT ");
      for (let i = 0; i < this.columns.length; i++) {
        const columnName = this.columns[i];
        if (i > 0) query.push(", ");
        query.push(`$${params.length + 1}`);
        params.push(columnName);
      }
    }
  }

  private resolveWhere(query: string[], params: string[]) {
    if (this.where.length === 0) return;
    query.push(" WHERE ");
    for (let i = 0; i < this.where.length; i++) {
      const where = this.where[i];
      if (i > 0) query.push(" AND ");
      query.push(`$${params.length + 1}`);
      params.push(where.column);
      query.push(` ${where.compare} $${params.length + 1}`);
      params.push(where.value);
    }
  }

  private resolveOrderBy(query: string[], params: string[]) {
    if (this.orderBy.length === 0) return;
    query.push(" ORDER BY ");
    for (let i = 0; i < this.orderBy.length; i++) {
      const orderBy = this.orderBy[i];
      if (i > 0) query.push(", ");
      query.push(`$${params.length + 1}`);
      params.push(orderBy.column);
      query.push(` ${orderBy.order}`);
    }
  }

  private resolveAggregate(query: string[], params: string[]) {
    if (this.groupBy == undefined) return;
    query.push(" GROUP BY ");

    query.push(`$${params.length + 1}`);
    params.push(this.groupBy.groupColumn);
  }

  public canContain(part: SQLQueryParts): boolean {
    if (part < this.currentPart) return false;
    if (part === this.currentPart)
      return part === SQLQueryParts.WHERE || part === SQLQueryParts.HAVING;
    return true;
  }
}

export { SQLQuery, SQLQueryParts };
