export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly publicMessage = message
  ) {
    super(message);
    this.name = "AppError";
  }
}

