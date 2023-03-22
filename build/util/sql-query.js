"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLQueryParts = exports.SQLQuery = exports.Aggregate = exports.Order = exports.Compare = void 0;
var SQLQueryParts;
(function (SQLQueryParts) {
    SQLQueryParts[SQLQueryParts["FROM"] = 0] = "FROM";
    SQLQueryParts[SQLQueryParts["WHERE"] = 1] = "WHERE";
    SQLQueryParts[SQLQueryParts["GROUP_BY"] = 2] = "GROUP_BY";
    SQLQueryParts[SQLQueryParts["HAVING"] = 3] = "HAVING";
    SQLQueryParts[SQLQueryParts["SELECT"] = 4] = "SELECT";
    SQLQueryParts[SQLQueryParts["ORDER_BY"] = 5] = "ORDER_BY";
    SQLQueryParts[SQLQueryParts["LIMIT"] = 6] = "LIMIT";
})(SQLQueryParts || (SQLQueryParts = {}));
exports.SQLQueryParts = SQLQueryParts;
var Compare;
(function (Compare) {
    Compare["EQUAL"] = "=";
    Compare["NOT_EQUAL"] = "!=";
    Compare["GREATER_THAN"] = ">";
    Compare["GREATER_THAN_OR_EQUAL"] = ">=";
    Compare["LESS_THAN"] = "<";
    Compare["LESS_THAN_OR_EQUAL"] = "<=";
    Compare["LIKE"] = "LIKE";
    Compare["NOT_LIKE"] = "NOT LIKE";
})(Compare = exports.Compare || (exports.Compare = {}));
var Order;
(function (Order) {
    Order["ASC"] = "ASC";
    Order["DESC"] = "DESC";
})(Order = exports.Order || (exports.Order = {}));
var Aggregate;
(function (Aggregate) {
    Aggregate["SUM"] = "SUM";
    Aggregate["AVG"] = "AVG";
    Aggregate["MIN"] = "MIN";
    Aggregate["MAX"] = "MAX";
    Aggregate["COUNT"] = "COUNT";
})(Aggregate = exports.Aggregate || (exports.Aggregate = {}));
// From where groupby having select orderby limit
class SQLQuery {
    constructor(from) {
        this.columns = [];
        this.orderBy = [];
        this.with = [];
        this.paramIdCount = 1;
        this.withIdCount = 0;
        this.columns = [];
        this.from = from;
        this.where = [];
        this.groupBy = undefined;
        this.having = [];
        this.orderBy = [];
        this.limit = 0;
        this.currentPart = SQLQueryParts.FROM;
    }
    joinLogicStatements(logicStatements) {
        let ands = [];
        for (let i = 0; i < logicStatements.length; i++) {
            const ors = logicStatements[i];
            ands.push(`(${ors.join(" OR ")})`);
        }
        return ands.join(" AND ");
    }
    checkTableName(tableName, verifiedTableNames) {
        if (tableName.includes(" ")) {
            throw new Error("Table name cannot contain spaces");
        }
        if (!verifiedTableNames.has(tableName)) {
            throw new Error(`Table name ${tableName} is not verified`);
        }
    }
    resolve({ verifiedTableNames }) {
        // const query = `SELECT ${this.columns.join(", ")} FROM ${
        //   this.from
        // } WHERE ${this.joinLogicStatements(this.where)}  GROUP BY ${
        //   this.groupBy
        // } HAVING ${this.joinLogicStatements(
        //   this.having
        // )} ORDER BY ${this.orderBy.join(", ")} LIMIT ${this.limit}`;
        let query = [];
        let params = [];
        this.resolveWith(query, params, verifiedTableNames);
        this.resolveSelect(query, params);
        this.resolveFrom(query, params, verifiedTableNames);
        this.resolveWhere(query, params);
        this.resolveOrderBy(query, params);
        return { text: query.join(" "), params: params };
    }
    resolveFrom(query, params, verifiedTableNames) {
        if (this.from.join) {
            query.push("FROM ");
            if (this.from.isIndex1) {
                query.push(`${this.from.tableName1}`);
            }
            else {
                this.checkTableName(this.from.tableName1, verifiedTableNames);
                params.push(this.from.tableName1);
            }
            if (!["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL JOIN"].includes(this.from.join)) {
                throw new Error(`Invalid join type ${this.from.join}`);
            }
            query.push(this.from.join);
            if (this.from.isIndex2) {
                query.push(`${this.from.tableName2}`);
            }
            else {
                this.checkTableName(this.from.tableName2, verifiedTableNames);
                params.push(this.from.tableName2);
            }
            // query.push("ON");
            // query.push(`${this.from.tableName1}.${this.from.on1}`);
            // query.push("=");
            // query.push(`${this.from.tableName2}.${this.from.on2}`);
            query.push(`USING (${this.from.on1})`);
        }
        else {
            if (this.from.isIndex1) {
                query.push(`FROM ${this.from.tableName1}`);
            }
            else {
                this.checkTableName(this.from.tableName1, verifiedTableNames);
                query.push(`FROM ${this.from.tableName1}`);
            }
        }
    }
    resolveWith(query, parentParams, verifiedTableNames) {
        if (this.with.length === 0)
            return;
        query.push(`WITH`);
        for (let i = 0; i < this.with.length; i++) {
            const withClause = this.with[i];
            const { text, params } = withClause.subQuery.resolve({
                verifiedTableNames,
            });
            query.push(`temp${i} AS (${text})`);
            if (i < this.with.length - 1)
                query.push(", ");
            parentParams.push(...params);
            this.paramIdCount += params.length;
        }
    }
    resolveSelect(query, params) {
        if (this.columns.length === 0) {
            query.push("SELECT *");
        }
        else if (this.groupBy != undefined) {
            query.push("SELECT ");
            query.push(`${this.groupBy.groupColumn}`);
            params.push();
            query.push(", ");
            query.push(this.groupBy.aggregate);
            query.push("(");
            query.push(`${this.groupBy.aggregateColumn}`);
            query.push(")");
        }
        else {
            query.push("SELECT ");
            for (let i = 0; i < this.columns.length; i++) {
                const columnName = this.columns[i];
                if (i > 0)
                    query.push(", ");
                query.push(`${columnName}`);
            }
        }
    }
    resolveWhere(query, params) {
        if (this.where.length === 0)
            return;
        query.push(" WHERE ");
        for (let i = 0; i < this.where.length; i++) {
            const where = this.where[i];
            if (i > 0)
                query.push(" AND ");
            query.push(`${where.column}`);
            query.push(` ${where.compare} $${params.length + 1}`);
            params.push(where.value);
        }
    }
    resolveOrderBy(query, params) {
        if (this.orderBy.length === 0)
            return;
        query.push(" ORDER BY ");
        for (let i = 0; i < this.orderBy.length; i++) {
            const orderBy = this.orderBy[i];
            if (i > 0)
                query.push(", ");
            query.push(`${orderBy.column}`);
            query.push(` ${orderBy.order}`);
        }
    }
    resolveAggregate(query, params) {
        if (this.groupBy == undefined)
            return;
        query.push(" GROUP BY ");
        query.push(`${this.groupBy.groupColumn}`);
    }
    canContain(part) {
        if (part < this.currentPart)
            return false;
        if (part === this.currentPart)
            return part === SQLQueryParts.WHERE || part === SQLQueryParts.HAVING;
        return true;
    }
}
exports.SQLQuery = SQLQuery;
