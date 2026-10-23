import { deleteSale, getSales, invalidateSalesCache } from '../cloudflare-api';

const getToken = jest.fn(async () => 'token');

// Respuesta controlable del Worker: la prueba decide cuándo "llega".
function deferredResponse() {
  let resolve!: (data: unknown) => void;
  const promise = new Promise<Response>((r) => {
    resolve = (data) =>
      r({ ok: true, status: 200, json: async () => ({ success: true, data }) } as Response);
  });
  return { promise, resolve };
}

const okResponse = (data: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data }) } as Response);

let fetchMock: jest.Mock;

beforeEach(() => {
  invalidateSalesCache();
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('caché de listas (getSales)', () => {
  it('dos llamadas seguidas comparten una sola petición al Worker', async () => {
    fetchMock.mockReturnValue(okResponse([{ id: 'v1' }]));

    const [a, b] = await Promise.all([getSales(getToken), getSales(getToken)]);
    await getSales(getToken);

    expect(a).toEqual([{ id: 'v1' }]);
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('después de borrar una venta vuelve a pedir la lista', async () => {
    fetchMock.mockReturnValueOnce(okResponse([{ id: 'v1' }, { id: 'v2' }]));
    await getSales(getToken);

    fetchMock.mockReturnValueOnce(okResponse(undefined)); // DELETE
    fetchMock.mockReturnValueOnce(okResponse([{ id: 'v2' }]));
    await deleteSale('v1', getToken);

    expect(await getSales(getToken)).toEqual([{ id: 'v2' }]);
  });

  it('una lectura que estaba en vuelo al invalidar no reescribe la caché con datos viejos', async () => {
    // 1. Empieza a cargar la lista (todavía incluye la venta v1).
    const stale = deferredResponse();
    fetchMock.mockReturnValueOnce(stale.promise);
    const pending = getSales(getToken);

    // 2. Mientras tanto se borra la venta: la caché se invalida.
    fetchMock.mockReturnValueOnce(okResponse(undefined));
    await deleteSale('v1', getToken);

    // 3. Llega la respuesta vieja.
    stale.resolve([{ id: 'v1' }, { id: 'v2' }]);
    await pending;

    // 4. La siguiente lectura debe ir al Worker, no servir la lista vieja.
    fetchMock.mockReturnValueOnce(okResponse([{ id: 'v2' }]));
    expect(await getSales(getToken)).toEqual([{ id: 'v2' }]);
  });
});
