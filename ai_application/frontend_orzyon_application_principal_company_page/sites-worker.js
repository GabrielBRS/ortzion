export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);

    if (assetResponse.status !== 404 || request.method !== 'GET') {
      return assetResponse;
    }

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (!acceptsHtml) {
      return assetResponse;
    }

    const fallbackUrl = new URL(request.url);
    fallbackUrl.pathname = '/index.html';
    fallbackUrl.search = '';
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};

