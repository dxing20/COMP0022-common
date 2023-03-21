import { SQLQuery } from "./sql-query";

export enum NodeType {
  ROOT,
  DATA,
  OTHER,
  JOIN,
  FILTER,
  AGGREGATE,
  SORT,
  LIMIT,
  SELECT,
}

export class RuntimeQueryHandler {
  queryTableNames: () => Promise<string[]>;
  queryColumns: (tableName: string) => Promise<string[]>;

  constructor(
    queryTableNames: () => Promise<string[]>,
    queryColumns: (tableName: string) => Promise<string[]>
  ) {
    this.queryTableNames = queryTableNames;
    this.queryColumns = queryColumns;
  }
}

export class Graph {
  i: number;
  nodes: GraphNode[];
  root: number | undefined;
  queryHandler: RuntimeQueryHandler;

  constructor(queryHandler: RuntimeQueryHandler) {
    this.i = 0;
    this.nodes = [];
    this.queryHandler = queryHandler;
  }

  async clientRefresh() {
    // reset all nodes
    for (let node of this.nodes) {
      node.status = ClientStatus.CHILD_UNRESOLVED;
    }

    // get available tablenames
    let tablenames;
    try {
      tablenames = await this.queryHandler.queryTableNames();
    } catch (e) {
      throw new Error("Could not resolve table names");
    }

    // start with parentless nodes and resolve them
    let parentlessNodes = this.nodes.filter((node) => !node.hasParent);
    for (let node of parentlessNodes) {
      await node.resolve(tablenames, this.queryHandler, this.nodes);
    }
  }

  async resolveRootQuery(): Promise<SQLQuery | undefined> {
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
      tablenames = await this.queryHandler.queryTableNames();
    } catch (e) {
      throw new Error("Could not resolve table names");
    }

    let sql = await this.nodes[this.root].resolve(
      tablenames,
      this.queryHandler,
      this.nodes
    );
    return sql.sqlQuery;
  }

  addDataNode(tableName: string) {
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
    let root = new RootNode(this.i++, parentlessNodes[0].id);
    root.depth = parentlessNodes[0].depth + 1;
    this.nodes.push(root);
    parentlessNodes[0].hasParent = true;
  }

  getGraph(): { nodes: any[]; edges: any[] } {
    let nodes = [];
    let edges = [];
    let freq: number[] = new Array(30).fill(0);

    for (let node of this.nodes) {
      nodes.push(node.generateNode(freq));
      let edge = node.generateEdge(this.nodes);
      if (edge) {
        edges.push(edge);
      }
    }

    return { nodes, edges };
  }
}

export const cloneGraph = (graph: Graph): Graph => {
  const newGraph: Graph = new Graph(graph.queryHandler);
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
    } else if (node instanceof RootNode) {
      const newNode = new RootNode(node.id, node.child);
      newNode.status = node.status;
      newNode.depth = node.depth;
      newNode.error = node.error;
      newNode.hasParent = node.hasParent;
      newNode.columns = [...node.columns];
      newNode.child = node.child;
      return newNode;
    } else {
      throw new Error("Unknown node type");
    }
  });

  graph.root = graph.root;

  return newGraph;
};

export enum ClientStatus {
  CHILD_UNRESOLVED,
  RESOLVED,
  ERROR,
}

export class GraphNode {
  id: number;
  type: NodeType = NodeType.OTHER;
  status: ClientStatus;
  error: string | undefined;
  hasParent: boolean = false;
  depth: number = 0;
  columns: string[] = [];

  constructor(id: number) {
    this.id = id;
    this.status = ClientStatus.CHILD_UNRESOLVED;
  }

  async resolve(
    tableNames: string[],
    queryHandler: RuntimeQueryHandler,
    otherNodes: GraphNode[]
  ): Promise<{ sqlQuery: SQLQuery | undefined }> {
    throw new Error("Not implemented");
  }

  generateNode(freq: number[]): any {
    throw new Error("Not implemented");
  }

  generateEdge(otherNodes: GraphNode[]): any {
    throw new Error("Not implemented");
  }
}

export class DataNode implements GraphNode {
  tableName: string;
  type = NodeType.DATA;
  id: number;
  status: ClientStatus;
  depth = 0;
  error: string | undefined;
  hasParent: boolean = false;
  columns: string[] = [];

  constructor(id: number, tableName: string) {
    this.id = id;
    this.tableName = tableName;
    this.status = ClientStatus.CHILD_UNRESOLVED;
  }

  async resolve(
    tableNames: string[],
    queryHandler: RuntimeQueryHandler,
    otherNodes: GraphNode[]
  ): Promise<{ sqlQuery: SQLQuery | undefined }> {
    if (!tableNames.includes(this.tableName)) {
      this.status = ClientStatus.ERROR;
      this.error = `Table ${this.tableName} does not exist`;
      return { sqlQuery: undefined };
    }

    try {
      this.columns = await queryHandler.queryColumns(this.tableName);
    } catch (e) {
      this.status = ClientStatus.ERROR;
      this.error = `Could not resolve columns for table ${this.tableName}`;
      return { sqlQuery: undefined };
    }

    this.status = ClientStatus.RESOLVED;
    return {
      sqlQuery: new SQLQuery({
        join: undefined,
        isIndex1: false,
        tableName1: this.tableName,
        isIndex2: false,
        tableName2: "",
        on1: "",
        on2: "",
      }),
    };
  }

  generateNode(freq: number[]): any {
    return {
      id: `${this.id}`,
      type: "input",
      data: { label: this.tableName },
      position: { x: 200 * this.depth, y: freq[this.depth]++ * 50 },
      connectable: false,
      sourcePosition: "right",
    };
  }

  generateEdge(otherNodes: GraphNode[]): any {
    return undefined;
  }
}

export class RootNode implements GraphNode {
  id: number;
  type = NodeType.ROOT;
  status: ClientStatus;
  error: string | undefined;
  depth: number = 0;
  child: number;
  hasParent: boolean = false;
  columns: string[] = [];

  constructor(id: number, child: number) {
    this.id = id;
    this.status = ClientStatus.CHILD_UNRESOLVED;
    this.child = child;
  }

  async resolve(
    tableNames: string[],
    queryHandler: RuntimeQueryHandler,
    otherNodes: GraphNode[]
  ): Promise<{ sqlQuery: SQLQuery | undefined }> {
    let childQuery;
    let child = otherNodes.find((node) => node.id === this.child);
    if (!child) {
      this.status = ClientStatus.ERROR;
      this.error = "Child node not found";
      return { sqlQuery: undefined };
    }

    if (child.status == ClientStatus.CHILD_UNRESOLVED) {
      childQuery = await child.resolve(tableNames, queryHandler, otherNodes);
      this.columns = child.columns;
    } else if (child.status == ClientStatus.ERROR) {
      this.status = ClientStatus.ERROR;
      this.error = "Child node has error";
      return { sqlQuery: undefined };
    } else {
      throw new Error("Child node has unexpected status");
    }

    return { sqlQuery: childQuery.sqlQuery };
  }

  generateNode(freq: number[]): any {
    const f: number = freq[this.depth] * 50;
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

  generateEdge(otherNodes: GraphNode[]): any {
    let child = otherNodes.find((node) => node.id === this.child);
    if (!child) {
      throw new Error("Child node not found");
    }
    return {
      id: `e${child.id}-${this.id}`,
      source: `${child.id}`,
      target: `${this.id}`,
    };
  }
}
