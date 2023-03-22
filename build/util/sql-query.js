"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLQueryParts = exports.SQLQuery = void 0;
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
// From where groupby having select orderby limit
class SQLQuery {
    constructor(from) {
        this.columns = [];
        this.groupBy = "";
        this.orderBy = [];
        this.with = [];
        this.paramIdCount = 1;
        this.withIdCount = 0;
        this.columns = [];
        this.from = from;
        this.where = [];
        this.groupBy = "";
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
            query.push("ON");
            query.push(`$${this.paramIdCount++}`);
            params.push(this.from.on1);
            query.push("=");
            query.push(`$${this.paramIdCount++}`);
            params.push(this.from.on2);
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
        else {
            query.push("SELECT ");
            for (let i = 0; i < this.columns.length; i++) {
                const columnName = this.columns[i];
                if (i > 0)
                    query.push(", ");
                query.push(`$${params.length + 1}`);
                params.push(columnName);
            }
        }
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
