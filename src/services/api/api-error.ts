export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly correlationId?: string,
  ) {
    super(
      status === 401
        ? 'Your session has expired.'
        : status === 403
          ? 'You do not have permission to view these records.'
          : status === 404
            ? 'The requested record was not found.'
            : status === 409
              ? 'This record changed. Refresh before trying again.'
              : status === 422 || status === 400
                ? 'The request could not be accepted.'
                : 'The request could not be completed. Please try again.',
    );
    this.name = 'ApiError';
  }
}
