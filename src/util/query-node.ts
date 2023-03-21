import { SQLQuery } from "./sql-query";

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
  root: RootNode | undefined;
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
      await node.resolve(tablenames, this.queryHandler);
    }
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
    this.root = new RootNode(this.i++, parentlessNodes[0]);
    this.root.depth = parentlessNodes[0].depth - 1;
    this.nodes.push(this.root);
    parentlessNodes[0].hasParent = true;
  }

  getGraph(): { nodes: any[]; edges: any[] } {
    let nodes = [];
    let edges = [];
    let freq = new Array(this.nodes.length).fill(0);

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

export enum ClientStatus {
  CHILD_UNRESOLVED,
  RESOLVED,
  ERROR,
}

export class GraphNode {
  id: number;
  status: ClientStatus;
  error: string | undefined;
  hasParent: boolean = false;
  depth: number = 0;
  columns: string[] = [];

  constructor(id: number) {
    this.id = id;
    this.status = ClientStatus.CHILD_UNRESOLVED;
  }

  getChildren(): GraphNode[] {
    throw new Error("Not implemented");
  }

  async resolve(
    tableNames: string[],
    queryHandler: RuntimeQueryHandler
  ): Promise<{ sqlQuery: SQLQuery | undefined }> {
    throw new Error("Not implemented");
  }

  generateNode(freq: number[]): any {
    throw new Error("Not implemented");
  }

  generateEdge(): any {
    throw new Error("Not implemented");
  }
}

export class DataNode implements GraphNode {
  tableName: string;
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
    queryHandler: RuntimeQueryHandler
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

  getChildren(): GraphNode[] {
    return [];
  }

  generateNode(freq: number[]): any {
    return {
      id: this.id,
      type: "input",
      data: { label: this.tableName },
      position: { x: 200 * this.depth, y: freq[this.depth]++ * 50 },
      connectable: false,
      sourcePosition: "right",
    };
  }

  generateEdge(): any {
    return undefined;
  }
}

export class RootNode implements GraphNode {
  id: number;
  status: ClientStatus;
  error: string | undefined;
  depth: number = 0;
  child: GraphNode;
  hasParent: boolean = false;
  columns: string[] = [];

  constructor(id: number, child: GraphNode) {
    this.id = id;
    this.status = ClientStatus.CHILD_UNRESOLVED;
    this.child = child;
  }

  getChildren(): GraphNode[] {
    return [this.child];
  }

  async resolve(
    tableNames: string[],
    queryHandler: RuntimeQueryHandler
  ): Promise<{ sqlQuery: SQLQuery | undefined }> {
    let childQuery;

    if (this.child.status == ClientStatus.CHILD_UNRESOLVED) {
      childQuery = await this.child.resolve(tableNames, queryHandler);
      this.columns = this.child.columns;
    } else if (this.child.status == ClientStatus.ERROR) {
      this.status = ClientStatus.ERROR;
      this.error = "Child node has error";
      return { sqlQuery: undefined };
    } else {
      throw new Error("Child node has unexpected status");
    }

    return { sqlQuery: childQuery.sqlQuery };
  }

  generateNode(freq: number[]): any {
    return {
      id: "0",
      type: "output",
      data: { label: "Root" },
      position: { x: 200 * this.depth, y: freq[this.depth]++ * 50 },
      connectable: false,
      targetPosition: "left",
    };
  }

  generateEdge(): any {
    return {
      id: `e${this.child.id}-${this.id}`,
      source: this.child.id,
      target: this.id,
    };
  }
}
