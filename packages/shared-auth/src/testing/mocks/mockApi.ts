export function mockApi<T>(fixtures: Record<string, T>) {
  const hermesGet = async (path: string) => {
    const key = path.replace(/^\/api\//, '').replace(/^\//, '');
    const data = fixtures[key];
    return data !== undefined
      ? { data, status: 200 }
      : { data: { message: 'Not found' }, status: 404 };
  };

  const hermesPost = async (path: string, body: unknown) => {
    const key = path.replace(/^\/api\//, '').replace(/^\//, '');
    const data = fixtures[key];
    return data !== undefined
      ? { data: { ...(data as object), ...(body as object) }, status: 200 }
      : { data: { message: 'Not found' }, status: 404 };
  };

  return { hermesGet, hermesPost };
}