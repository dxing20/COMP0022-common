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
exports.RootNode = exports.DataNode = exports.GraphNode = exports.ClientStatus = exports.cloneGraph = exports.Graph = exports.RuntimeQueryHandler = void 0;
const sql_query_1 = require("./sql-query");
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
                yield node.resolve(tablenames, this.queryHandler);
            }
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
        this.root = new RootNode(this.i++, parentlessNodes[0]);
        this.root.depth = parentlessNodes[0].depth + 1;
        this.nodes.push(this.root);
        parentlessNodes[0].hasParent = true;
    }
    getGraph() {
        let nodes = [];
        let edges = [];
        let freq = new Array(30).fill(0);
        for (let node of this.nodes) {
            nodes.push(node.generateNode(freq));
            let edge = node.generateEdge();
            if (edge) {
                edges.push(edge);
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
        else {
            throw new Error("Unknown node type");
        }
    });
    if (graph.root) {
        const rootIndex = newGraph.nodes.findIndex((node) => node.id === graph.root.id);
        if (rootIndex !== -1) {
            newGraph.root = newGraph.nodes[rootIndex];
        }
    }
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
        this.hasParent = false;
        this.depth = 0;
        this.columns = [];
        this.id = id;
        this.status = ClientStatus.CHILD_UNRESOLVED;
    }
    getChildren() {
        throw new Error("Not implemented");
    }
    resolve(tableNames, queryHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Not implemented");
        });
    }
    generateNode(freq) {
        throw new Error("Not implemented");
    }
    generateEdge() {
        throw new Error("Not implemented");
    }
}
exports.GraphNode = GraphNode;
class DataNode {
    constructor(id, tableName) {
        this.depth = 0;
        this.hasParent = false;
        this.columns = [];
        this.id = id;
        this.tableName = tableName;
        this.status = ClientStatus.CHILD_UNRESOLVED;
    }
    resolve(tableNames, queryHandler) {
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
    getChildren() {
        return [];
    }
    generateNode(freq) {
        return {
            id: `${this.id}`,
            type: "input",
            data: { label: this.tableName },
            position: { x: 200 * this.depth, y: freq[this.depth]++ * 50 },
            connectable: false,
            sourcePosition: "right",
        };
    }
    generateEdge() {
        return undefined;
    }
}
exports.DataNode = DataNode;
class RootNode {
    constructor(id, child) {
        this.depth = 0;
        this.hasParent = false;
        this.columns = [];
        this.id = id;
        this.status = ClientStatus.CHILD_UNRESOLVED;
        this.child = child;
    }
    getChildren() {
        return [this.child];
    }
    resolve(tableNames, queryHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            let childQuery;
            if (this.child.status == ClientStatus.CHILD_UNRESOLVED) {
                childQuery = yield this.child.resolve(tableNames, queryHandler);
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
    generateNode(freq) {
        const f = freq[this.depth] * 50;
        freq[this.depth] = freq[this.depth] + 1;
        return {
            id: `${this.id}`,
            type: "output",
            data: { label: "Root" },
            position: { x: 200 * this.depth, y: f },
            connectable: false,
            targetPosition: "left",
        };
    }
    generateEdge() {
        return {
            id: `e${this.child.id}-${this.id}`,
            source: this.child.id,
            target: this.id,
        };
    }
}
exports.RootNode = RootNode;
