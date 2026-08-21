const failed = async (response: Response): Promise<never> => {
  const body = (await response.json().catch(() => null)) as null | {
    message?: string | string[];
  };
  const message = Array.isArray(body?.message)
    ? body.message.join(", ")
    : (body?.message ?? response.statusText);
  throw new Error(message);
};

export const request = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    ...(init.body ? { headers: { "content-type": "application/json" } } : {}),
  });

  if (!response.ok) {
    return failed(response);
  }

  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
};
