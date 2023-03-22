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
exports.JoinNode = exports.JoinType = exports.RootNode = exports.DataNode = exports.GraphNode = exports.ClientStatus = exports.cloneGraph = exports.Graph = exports.RuntimeQueryHandler = exports.NodeType = void 0;
const sql_query_1 = require("./sql-query");
var NodeType;
(function (NodeType) {
    NodeType[NodeType["ROOT"] = 0] = "ROOT";
    NodeType[NodeType["DATA"] = 1] = "DATA";
    NodeType[NodeType["OTHER"] = 2] = "OTHER";
    NodeType[NodeType["JOIN"] = 3] = "JOIN";
    NodeType[NodeType["FILTER"] = 4] = "FILTER";
    NodeType[NodeType["AGGREGATE"] = 5] = "AGGREGATE";
    NodeType[NodeType["SORT"] = 6] = "SORT";
    NodeType[NodeType["LIMIT"] = 7] = "LIMIT";
    NodeType[NodeType["SELECT"] = 8] = "SELECT";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
class RuntimeQueryHandler {
    constructor(queryTableNames, queryColumns) {
        this.queryTableNames = queryTableNames;
        this.queryColumns = queryColumns;
    }
}
exports.RuntimeQueryHandler = RuntimeQueryHandler;
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
                yield node.resolve(tablenames, this.queryHandler, this.nodes);
            }
        });
    }
    resolveRootQuery() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.root) {
                throw new Error("Root node does not exist");
            }
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
            let sql = yield this.nodes[this.root].resolve(tablenames, this.queryHandler, this.nodes);
            return sql.sqlQuery;
        });
    }
    addDataNode(tableName) {
        this.nodes.push(new DataNode(this.i++, tableName));
        this.nodes[this.nodes.length - 1].depth = 0;
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
        this.root = this.i++;
        let root = new RootNode(this.i, parentlessNodes[0].id);
        root.depth = parentlessNodes[0].depth + 1;
        this.nodes.push(root);
        parentlessNodes[0].hasParent = true;
    }
    addJoinNode(child1, child2, joinType, on1, on2) {
        let newJoinNode = new JoinNode(this.i++, child1, child2, joinType, on1, on2);
        newJoinNode.depth =
            this.nodes[child1].depth > this.nodes[child2].depth
                ? this.nodes[child1].depth + 1
                : this.nodes[child2].depth + 1;
        this.nodes.push(newJoinNode);
        this.nodes[child1].hasParent = true;
        this.nodes[child2].hasParent = true;
    }
    getGraph() {
        let nodes = [];
        let edges = [];
        let freq = new Array(30).fill(0);
        for (let node of this.nodes) {
            nodes.push(node.generateNode(freq));
            let edge = node.generateEdge(this.nodes);
            if (edge) {
                edges.push(...edge);
            }
        }
        return { nodes, edges };
    }
}
exports.Graph = Graph;
const cloneGraph = (graph) => {
    const newGraph = new Graph(graph.queryHandler);
    newGraph.i = graph.i;
    newGraph.nodes = graph.nodes.map((node) => {
        if (node instanceof DataNode) {
            const newNode = new DataNode(node.id, node.tableName);
            newNode.status = node.status;
            newNode.depth = node.depth;
            newNode.error = node.error;
            newNode.hasParent = node.hasParent;
            newNode.columns = [...node.columns];
            return newNode;
        }
        else if (node instanceof RootNode) {
            const newNode = new RootNode(node.id, node.child);
            newNode.status = node.status;
            newNode.depth = node.depth;
            newNode.error = node.error;
            newNode.hasParent = node.hasParent;
            newNode.columns = [...node.columns];
            return newNode;
        }
        else if (node instanceof JoinNode) {
            const newNode = new JoinNode(node.id, node.child1, node.child2, node.joinType, node.on1, node.on2);
            newNode.status = node.status;
            newNode.depth = node.depth;
            newNode.error = node.error;
            newNode.hasParent = node.hasParent;
            newNode.columns = [...node.columns];
            return newNode;
        }
        else {
            throw new Error("Unknown node type");
        }
    });
    graph.root = graph.root;
    return newGraph;
};
exports.cloneGraph = cloneGraph;
var ClientStatus;
(function (ClientStatus) {
    ClientStatus[ClientStatus["CHILD_UNRESOLVED"] = 0] = "CHILD_UNRESOLVED";
    ClientStatus[ClientStatus["RESOLVED"] = 1] = "RESOLVED";
    ClientStatus[ClientStatus["ERROR"] = 2] = "ERROR";
})(ClientStatus = exports.ClientStatus || (exports.ClientStatus = {}));
class GraphNode {
    constructor(id) {
        this.type = NodeType.OTHER;
        this.hasParent = false;
        this.depth = 0;
        this.columns = [];
        this.id = id;
        this.status = ClientStatus.CHILD_UNRESOLVED;
    }
    resolve(tableNames, queryHandler, otherNodes) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Not implemented");
        });
    }
    generateNode(freq) {
        throw new Error("Not implemented");
    }
    generateEdge(otherNodes) {
        throw new Error("Not implemented");
    }
}
exports.GraphNode = GraphNode;
class DataNode {
    constructor(id, tableName) {
        this.type = NodeType.DATA;
        this.depth = 0;
        this.hasParent = false;
        this.columns = [];
        this.id = id;
        this.tableName = tableName;
        this.status = ClientStatus.CHILD_UNRESOLVED;
    }
    resolve(tableNames, queryHandler, otherNodes) {
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
    generateNode(freq) {
        return {
            id: `${this.id}`,
            type: "input",
            data: { label: `${this.tableName} ${this.id}` },
            position: { x: 200 * this.depth, y: freq[this.depth]++ * 50 },
            connectable: false,
            sourcePosition: "right",
        };
    }
    generateEdge(otherNodes) {
        return [];
    }
}
exports.DataNode = DataNode;
class RootNode {
    constructor(id, child) {
        this.type = NodeType.ROOT;
        this.depth = 0;
        this.hasParent = false;
        this.columns = [];
        this.id = id;
        this.status = ClientStatus.CHILD_UNRESOLVED;
        this.child = child;
    }
    resolve(tableNames, queryHandler, otherNodes) {
        return __awaiter(this, void 0, void 0, function* () {
            let childQuery;
            let child = otherNodes.find((node) => node.id === this.child);
            if (!child) {
                this.status = ClientStatus.ERROR;
                this.error = "Child node not found";
                return { sqlQuery: undefined };
            }
            if (child.status == ClientStatus.CHILD_UNRESOLVED) {
                childQuery = yield child.resolve(tableNames, queryHandler, otherNodes);
                this.columns = child.columns;
            }
            else if (child.status == ClientStatus.ERROR) {
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
    generateNode(freq) {
        const f = freq[this.depth] * 50;
        freq[this.depth] = freq[this.depth] + 1;
        return {
            id: `${this.id}`,
            type: "output",
            data: { label: `ROOT ${this.id}` },
            position: { x: 200 * this.depth, y: f },
            connectable: false,
            targetPosition: "left",
        };
    }
    generateEdge(otherNodes) {
        return [
            {
                id: `e${this.child}-${this.id}`,
                source: `${this.child}`,
                target: `${this.id}`,
            },
        ];
    }
}
exports.RootNode = RootNode;
var JoinType;
(function (JoinType) {
    JoinType["INNER"] = "INNER JOIN";
    JoinType["LEFT"] = "LEFT JOIN";
    JoinType["RIGHT"] = "RIGHT JOIN";
    JoinType["FULL"] = "FULL JOIN";
})(JoinType = exports.JoinType || (exports.JoinType = {}));
class JoinNode {
    constructor(id, child1, child2, joinType, on1, on2) {
        this.type = NodeType.JOIN;
        this.depth = 0;
        this.hasParent = false;
        this.columns = [];
        this.id = id;
        this.status = ClientStatus.CHILD_UNRESOLVED;
        this.child1 = child1;
        this.child2 = child2;
        this.joinType = joinType;
        this.on1 = on1;
        this.on2 = on2;
    }
    resolve(tableNames, queryHandler, otherNodes) {
        return __awaiter(this, void 0, void 0, function* () {
            let childQuery1;
            let child1 = otherNodes.find((node) => node.id === this.child1);
            let childQuery2;
            let child2 = otherNodes.find((node) => node.id === this.child2);
            if (!child1 || !child2) {
                this.status = ClientStatus.ERROR;
                this.error = "Child node not found";
                return { sqlQuery: undefined };
            }
            if (child1.status == ClientStatus.CHILD_UNRESOLVED) {
                childQuery1 = yield child1.resolve(tableNames, queryHandler, otherNodes);
            }
            if (child2.status == ClientStatus.CHILD_UNRESOLVED) {
                childQuery2 = yield child2.resolve(tableNames, queryHandler, otherNodes);
            }
            if (child1.status == ClientStatus.ERROR ||
                child2.status == ClientStatus.ERROR ||
                !(childQuery1 === null || childQuery1 === void 0 ? void 0 : childQuery1.sqlQuery) ||
                !(childQuery2 === null || childQuery2 === void 0 ? void 0 : childQuery2.sqlQuery)) {
                this.status = ClientStatus.ERROR;
                this.error = "Child node has error";
                return { sqlQuery: undefined };
            }
            const sqlQuery = new sql_query_1.SQLQuery({
                join: this.joinType,
                on1: this.on1,
                on2: this.on2,
                isIndex1: true,
                isIndex2: true,
                tableName1: "temp0",
                tableName2: "temp1",
            });
            sqlQuery.withIdCount += 2;
            if (this.on1 != this.on2) {
                this.status = ClientStatus.ERROR;
                this.error = "Join on different columns not supported yet";
                return { sqlQuery: undefined };
            }
            // get overlap of columns
            const overlap = child1.columns.filter((value) => child2.columns.includes(value));
            if (overlap.length > 1) {
                this.status = ClientStatus.ERROR;
                this.error = "Too many common column names found";
                return { sqlQuery: undefined };
            }
            sqlQuery.with = [
                { subQuery: childQuery1.sqlQuery },
                { subQuery: childQuery2.sqlQuery },
            ];
            this.columns = child1.columns.concat(child2.columns);
            this.columns = this.columns.filter((value) => !overlap.includes(value));
            this.columns = this.columns.concat(overlap);
            return { sqlQuery: sqlQuery };
        });
    }
    generateNode(freq) {
        const f = freq[this.depth] * 50;
        freq[this.depth] = freq[this.depth] + 1;
        return {
            id: `${this.id}`,
            type: "default",
            data: { label: `JOIN ${this.id}` },
            position: { x: 200 * this.depth, y: f },
            connectable: false,
            targetPosition: "left",
            sourcePosition: "right",
        };
    }
    generateEdge(otherNodes) {
        let child1 = otherNodes.find((node) => node.id === this.child1);
        let child2 = otherNodes.find((node) => node.id === this.child2);
        if (!child1 || !child2) {
            throw new Error("Child node not found");
        }
        return [
            {
                id: `e${child1.id}-${this.id}`,
                source: `${child1.id}`,
                target: `${this.id}`,
            },
            {
                id: `e${child2.id}-${this.id}`,
                source: `${child2.id}`,
                target: `${this.id}`,
            },
        ];
    }
}
exports.JoinNode = JoinNode;
