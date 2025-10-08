export function serializeError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: serializeError(error.cause),
    };
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch (_) {
      return { message: String(error) };
    }
  }

  if (error === undefined) {
    return undefined;
  }

  return { message: String(error) };
}

export function deserializeError(info) {
  if (!info || typeof info !== 'object') {
    return new Error('Worker error');
  }

  const error = new Error(info.message || 'Worker error');
  if (info.name) {
    error.name = info.name;
  }
  if (info.stack) {
    error.stack = info.stack;
  }
  if (info.cause) {
    error.cause = deserializeError(info.cause);
  }

  for (const [key, value] of Object.entries(info)) {
    if (!['message', 'name', 'stack', 'cause'].includes(key)) {
      error[key] = value;
    }
  }

  return error;
}
