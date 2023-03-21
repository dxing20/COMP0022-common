class RuntimeQueryHandler {
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

class Graph {
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
      await node.clientResolve(tablenames, this.queryHandler);
    }
  }

  addDataNode(tableName: string) {
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

enum ClientStatus {
  CHILD_UNRESOLVED,
  RESOLVED,
  ERROR,
}

class GraphNode {
  id: number;
  status: ClientStatus;
  error: string | undefined;
  hasParent: boolean = false;
  columns: string[] = [];

  constructor(id: number) {
    this.id = id;
    this.status = ClientStatus.CHILD_UNRESOLVED;
  }

  getChildren(): GraphNode[] {
    throw new Error("Not implemented");
  }

  async clientResolve(
    tableNames: string[],
    queryHandler: RuntimeQueryHandler
  ): Promise<{ sqlQuery: SQLQuery | undefined }> {
    throw new Error("Not implemented");
  }
}

class DataNode implements GraphNode {
  tableName: string;
  id: number;
  status: ClientStatus;
  error: string | undefined;
  hasParent: boolean = false;
  columns: string[] = [];

  constructor(id: number, tableName: string) {
    this.id = id;
    this.tableName = tableName;
    this.status = ClientStatus.CHILD_UNRESOLVED;
  }

  async clientResolve(
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

  queryResolve(): { name: string; columns: string[]; sqlQuery: SQLQuery } {
    throw new Error("Not implemented");
  }

  getChildren(): GraphNode[] {
    return [];
  }
}

class RootNode implements GraphNode {
  id: number;
  status: ClientStatus;
  error: string | undefined;
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

  async clientResolve(
    tableNames: string[],
    queryHandler: RuntimeQueryHandler
  ): Promise<{ sqlQuery: SQLQuery | undefined }> {
    let childQuery;

    if (this.child.status == ClientStatus.CHILD_UNRESOLVED) {
      childQuery = await this.child.clientResolve(tableNames, queryHandler);
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
}
