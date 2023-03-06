import { DefinedError } from './defined-error';

export class PageNotFoundError extends DefinedError {
  statusCode = 404;
  expectedRoute: string;

  constructor(expectedRoute: string) {
    super('The page you are looking for does not exist');
    Object.setPrototypeOf(this, PageNotFoundError.prototype);
    this.expectedRoute = expectedRoute;
  }

  response() {
    return [{ message: 'Page not found', field: this.expectedRoute}];
  }
}
