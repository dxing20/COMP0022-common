enum SQLQueryParts {
  FROM = 0, // single
  WHERE, // multiple
  GROUP_BY, // single
  HAVING, // multiple
  SELECT, // single
  ORDER_BY, // single
  LIMIT, // single
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
  public where: string[][]; // and >> or >> text
  public groupBy: string = "";
  public having: string[][]; // and >> or >> text
  public orderBy: string[] = [];
  public limit: number;

  public with: { subQuery: SQLQuery }[] = [];

  public currentPart: SQLQueryParts;
  public paramIdCount: number = 0;
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
    this.groupBy = "";
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

    query.push(";");

    return { text: query.join(" "), params: [] };
  }

  private resolveFrom(
    query: string[],
    params: string[],
    verifiedTableNames: Set<string>
  ) {
    if (this.from.join) {
      query.push("FROM ");
      query.push(`$${params.length + 1}`);
      this.checkTableName(this.from.tableName1, verifiedTableNames);
      params.push(this.from.tableName1);

      if (
        !["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL JOIN"].includes(
          this.from.join
        )
      ) {
        throw new Error(`Invalid join type ${this.from.join}`);
      }
      query.push(this.from.join);
      query.push(`?(${this.from.tableName2})?`);
      query.push("ON");
      query.push(`?(${this.from.on1})?`);
      query.push("=");
      query.push(`?(${this.from.on2})?`);
    } else {
      if (this.from.isIndex1) {
        query.push(`FROM temp${this.from.tableName1}`);
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
      query.push(`temp${++this.withIdCount} AS (${text})`);
      if (i < this.with.length - 1) query.push(", ");
      parentParams.push(...params);
    }
  }

  private resolveSelect(query: string[], params: string[]) {
    if (this.columns.length === 0) {
      query.push("SELECT *");
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

  public canContain(part: SQLQueryParts): boolean {
    if (part < this.currentPart) return false;
    if (part === this.currentPart)
      return part === SQLQueryParts.WHERE || part === SQLQueryParts.HAVING;
    return true;
  }
}

export { SQLQuery, SQLQueryParts };
