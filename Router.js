const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
  CONNECT: "CONNECT",
  TRACE: "TRACE",
};

class RouteNode {
  constructor() {
    this.children = new Map();
    this.handler = new Map();
    this.wildCardHandlers = new Map();
    this.dynamicChild = null;
  }
  add(path, method, handler, isLastPath) {
    method = method.toUpperCase();

    let newNode = new RouteNode();

    if (path === "*") {
      if (!isLastPath) throw new Error("'*' wildcard should be the last.");
      this.wildCardHandlers.set(method, handler);
      return;
    }

    if (path.startsWith(":")) {
      this.dynamicChild = this.dynamicChild || {};
      this.dynamicChild["paramName"] = path.substring(1);
      this.dynamicChild["node"] = newNode;
    } else {
      this.children.set(path, newNode);
    }

    if (isLastPath) newNode.addHandler(method, handler);

    return newNode;
  }
  addHandler(method, handler, node = this) {
    node.handler.set(method.toUpperCase(), handler);
  }
}

class TrieRouter {
  constructor() {
    this.root = new RouteNode();
  }
  addRoute(path, method, handler) {
    if (
      typeof path != "string" ||
      typeof handler != "function" ||
      typeof method != "string"
    ) {
      throw new Error(
        "'path' should be of the type `string` and 'handler' should be of the type `function` and 'path' should be of type `string`"
      );
    }
    if (!HTTP_METHODS[method.toUpperCase()])
      throw new Error("Invalid HTTP method");
    let segmentedPath = this.#normalizePath(path);
    let currentNode = this.root;
    for (let pathIndex = 0; pathIndex < segmentedPath.length; pathIndex++) {
      let currentPath = segmentedPath[pathIndex];
      let foundNode = currentNode.children.get(currentPath);

      if (foundNode) {
        currentNode = foundNode;
        if (pathIndex === segmentedPath.length - 1) {
          currentNode.addHandler(method, handler);
        }
      } else {
        let insertedNode = currentNode.add(
          currentPath,
          method,
          handler,
          pathIndex === segmentedPath.length - 1
        );
        currentNode = insertedNode;
      }
    }
  }

  #normalizePath(path) {
    let splittedNormalizedPath = path.split("/").filter((path) => {
      if (!path) return;
      if (path.startsWith(":")) return path;
      return path.toLowerCase();
    });
    return splittedNormalizedPath;
  }

  findRoute(path, method) {
    if (!HTTP_METHODS[method.toUpperCase()])
      throw new Error("Invalid HTTP method");

    method = method.toUpperCase();
    let normalizedPath = this.#normalizePath(path);
    let currentNode = this.root;
    let handler = null;
    let dynamicParams = {};
    let fallBackHandler = null;

    for (let pathIndex = 0; pathIndex < normalizedPath.length; pathIndex++) {
      let nextNode = currentNode.children.get(normalizedPath[pathIndex]);
      if (!nextNode && currentNode.dynamicChild) {
        nextNode = currentNode.dynamicChild["node"];
        dynamicParams[currentNode.dynamicChild.paramName] =
          normalizedPath[pathIndex];
      }
      if (currentNode.wildCardHandlers) {
        fallBackHandler = currentNode.wildCardHandlers.get(method);
      }
      if (!nextNode) {
        break;
      }
      if (
        pathIndex === normalizedPath.length - 1 &&
        !nextNode.handler.has(method)
      ) {
        break;
      }
      if (pathIndex === normalizedPath.length - 1) {
        handler = nextNode.handler.get(method);
      }

      currentNode = nextNode;
    }
    return { handler: handler || fallBackHandler, params: dynamicParams };
  }
}

const trieRouter = new TrieRouter();
trieRouter.addRoute("/api/books/:id", "GET", function () {
  console.log("The silence of the lambs");
});
trieRouter.findRoute("/api/books/1", "GET");
