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
    let root = new RootNode(this.i, parentlessNodes[0].id);
    root.depth = parentlessNodes[0].depth + 1;
    this.nodes.push(root);
    parentlessNodes[0].hasParent = true;
  }

  addJoinNode(
    child1: number,
    child2: number,
    joinType: JoinType,
    on1: string,
    on2: string
  ) {
    let newJoinNode = new JoinNode(
      this.i++,
      child1,
      child2,
      joinType,
      on1,
      on2
    );
    newJoinNode.depth =
      this.nodes[child1].depth > this.nodes[child2].depth
        ? this.nodes[child1].depth + 1
        : this.nodes[child2].depth + 1;
    this.nodes.push(newJoinNode);
    this.nodes[child1].hasParent = true;
    this.nodes[child2].hasParent = true;
  }

  getGraph(): { nodes: any[]; edges: any[] } {
    let nodes = [];
    let edges = [];
    let freq: number[] = new Array(30).fill(0);

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
      return newNode;
    } else if (node instanceof JoinNode) {
      const newNode = new JoinNode(
        node.id,
        node.child1,
        node.child2,
        node.joinType,
        node.on1,
        node.on2
      );
      newNode.status = node.status;
      newNode.depth = node.depth;
      newNode.error = node.error;
      newNode.hasParent = node.hasParent;
      newNode.columns = [...node.columns];
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

  generateEdge(otherNodes: GraphNode[]): any[] {
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
      data: { label: `${this.tableName} ${this.id}` },
      position: { x: 200 * this.depth, y: freq[this.depth]++ * 50 },
      connectable: false,
      sourcePosition: "right",
    };
  }

  generateEdge(otherNodes: GraphNode[]): any[] {
    return [];
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
      data: { label: `ROOT ${this.id}` },
      position: { x: 200 * this.depth, y: f },
      connectable: false,
      targetPosition: "left",
    };
  }

  generateEdge(otherNodes: GraphNode[]): any[] {
    return [
      {
        id: `e${this.child}-${this.id}`,
        source: `${this.child}`,
        target: `${this.id}`,
      },
    ];
  }
}

export enum JoinType {
  INNER = "INNER JOIN",
  LEFT = "LEFT JOIN",
  RIGHT = "RIGHT JOIN",
  FULL = "FULL JOIN",
}

export class JoinNode implements GraphNode {
  id: number;
  type = NodeType.JOIN;
  status: ClientStatus;
  error: string | undefined;
  depth: number = 0;
  child1: number;
  child2: number;
  hasParent: boolean = false;
  columns: string[] = [];
  joinType: JoinType;
  on1: string;
  on2: string;

  constructor(
    id: number,
    child1: number,
    child2: number,
    joinType: JoinType,
    on1: string,
    on2: string
  ) {
    this.id = id;
    this.status = ClientStatus.CHILD_UNRESOLVED;
    this.child1 = child1;
    this.child2 = child2;
    this.joinType = joinType;
    this.on1 = on1;
    this.on2 = on2;
  }

  async resolve(
    tableNames: string[],
    queryHandler: RuntimeQueryHandler,
    otherNodes: GraphNode[]
  ): Promise<{ sqlQuery: SQLQuery | undefined }> {
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
      childQuery1 = await child1.resolve(tableNames, queryHandler, otherNodes);
    }
    if (child2.status == ClientStatus.CHILD_UNRESOLVED) {
      childQuery2 = await child2.resolve(tableNames, queryHandler, otherNodes);
    }

    if (
      child1.status == ClientStatus.ERROR ||
      child2.status == ClientStatus.ERROR ||
      !childQuery1 ||
      !childQuery2
    ) {
      this.status = ClientStatus.ERROR;
      this.error = "Child node has error";
      return { sqlQuery: undefined };
    }

    const sqlQuery: SQLQuery = new SQLQuery({
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
    const overlap = child1.columns.filter((value) =>
      child2!.columns.includes(value)
    );
    if (overlap.length > 1) {
      this.status = ClientStatus.ERROR;
      this.error = "Too many common column names found";
      return { sqlQuery: undefined };
    }

    sqlQuery.with = [childQuery1!, childQuery2!];

    this.columns = child1.columns.concat(child2.columns);
    this.columns = this.columns.filter((value) => !overlap.includes(value));
    this.columns = this.columns.concat(overlap);

    return { sqlQuery: sqlQuery };
  }

  generateNode(freq: number[]): any {
    const f: number = freq[this.depth] * 50;
    freq[this.depth] = freq[this.depth] + 1;
    return {
      id: `${this.id}`,
      type: "output",
      data: { label: `JOIN ${this.id}` },
      position: { x: 200 * this.depth, y: f },
      connectable: false,
      targetPosition: "left",
      sourcePosition: "right",
    };
  }

  generateEdge(otherNodes: GraphNode[]): any[] {
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
