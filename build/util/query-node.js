"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientStatus = exports.RootNode = exports.DataNode = exports.GraphNode = exports.Graph = void 0;
const sql_query_1 = require("./sql-query");
class RuntimeQueryHandler {
    constructor(queryTableNames, queryColumns) {
        this.queryTableNames = queryTableNames;
        this.queryColumns = queryColumns;
    }
}
class Graph {
    constructor(queryHandler) {
        this.i = 0;
        this.nodes = [];
        this.queryHandler = queryHandler;
    }
    clientRefresh() {
        return __awaiter(this, void 0, void 0, function* () {
            // reset all nodes
            for (let node of this.nodes) {
                node.status = ClientStatus.CHILD_UNRESOLVED;
            }
            // get available tablenames
            let tablenames;
            try {
                tablenames = yield this.queryHandler.queryTableNames();
            }
            catch (e) {
                throw new Error("Could not resolve table names");
            }
            // start with parentless nodes and resolve them
            let parentlessNodes = this.nodes.filter((node) => !node.hasParent);
            for (let node of parentlessNodes) {
                yield node.clientResolve(tablenames, this.queryHandler);
            }
        });
    }
    addDataNode(tableName) {
        this.nodes.push(new DataNode(this.i++, tableName));
    }
    addRootNode() {
        // check if only one node has no parent
        let parentlessNodes = this.nodes.filter((node) => !node.hasParent);
        if (parentlessNodes.length != 1) {
            throw new Error("Root node requires exactly one parentless node");
        }
        // check if root node already exists
        if (this.nodes.filter((node) => node instanceof RootNode).length > 0) {
            throw new Error("Root node already exists");
        }
        // add root node
        this.root = new RootNode(this.i++, parentlessNodes[0]);
        this.nodes.push(this.root);
        parentlessNodes[0].hasParent = true;
    }
}
exports.Graph = Graph;
var ClientStatus;
(function (ClientStatus) {
    ClientStatus[ClientStatus["CHILD_UNRESOLVED"] = 0] = "CHILD_UNRESOLVED";
    ClientStatus[ClientStatus["RESOLVED"] = 1] = "RESOLVED";
    ClientStatus[ClientStatus["ERROR"] = 2] = "ERROR";
})(ClientStatus || (ClientStatus = {}));
exports.ClientStatus = ClientStatus;
class GraphNode {
    constructor(id) {
        this.hasParent = false;
        this.columns = [];
        this.id = id;
        this.status = ClientStatus.CHILD_UNRESOLVED;
    }
    getChildren() {
        throw new Error("Not implemented");
    }
    clientResolve(tableNames, queryHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Not implemented");
        });
    }
}
exports.GraphNode = GraphNode;
class DataNode {
    constructor(id, tableName) {
        this.hasParent = false;
        this.columns = [];
        this.id = id;
        this.tableName = tableName;
        this.status = ClientStatus.CHILD_UNRESOLVED;
    }
    clientResolve(tableNames, queryHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!tableNames.includes(this.tableName)) {
                this.status = ClientStatus.ERROR;
                this.error = `Table ${this.tableName} does not exist`;
                return { sqlQuery: undefined };
            }
            try {
                this.columns = yield queryHandler.queryColumns(this.tableName);
            }
            catch (e) {
                this.status = ClientStatus.ERROR;
                this.error = `Could not resolve columns for table ${this.tableName}`;
                return { sqlQuery: undefined };
            }
            this.status = ClientStatus.RESOLVED;
            return {
                sqlQuery: new sql_query_1.SQLQuery({
                    join: undefined,
                    isIndex1: false,
                    tableName1: this.tableName,
                    isIndex2: false,
                    tableName2: "",
                    on1: "",
                    on2: "",
                }),
            };
        });
    }
    queryResolve() {
        throw new Error("Not implemented");
    }
    getChildren() {
        return [];
    }
}
exports.DataNode = DataNode;
class RootNode {
    constructor(id, child) {
        this.hasParent = false;
        this.columns = [];
        this.id = id;
        this.status = ClientStatus.CHILD_UNRESOLVED;
        this.child = child;
    }
    getChildren() {
        return [this.child];
    }
    clientResolve(tableNames, queryHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            let childQuery;
            if (this.child.status == ClientStatus.CHILD_UNRESOLVED) {
                childQuery = yield this.child.clientResolve(tableNames, queryHandler);
                this.columns = this.child.columns;
            }
            else if (this.child.status == ClientStatus.ERROR) {
                this.status = ClientStatus.ERROR;
                this.error = "Child node has error";
                return { sqlQuery: undefined };
            }
            else {
                throw new Error("Child node has unexpected status");
            }
            return { sqlQuery: childQuery.sqlQuery };
        });
    }
}
exports.RootNode = RootNode;
