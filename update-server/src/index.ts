interface GitHubRelease {
  tag_name: string;
  body: string | null;
  published_at: string;
  assets: { name: string; browser_download_url: string }[];
}

interface Env {
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

const CORS = { 'Access-Control-Allow-Origin': '*' } as const;

function getPlatformKey(target: string, arch: string): string {
  if (target === 'darwin') {
    return arch === 'aarch64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
  }
  if (target === 'linux') return 'x86_64-unknown-linux-gnu';
  if (target === 'windows') return 'x86_64-pc-windows-msvc';
  return `${arch}-${target}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 3) {
      return new Response(JSON.stringify({ error: 'Usage: /<target>/<arch>/<current_version>' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const [target, arch, currentVersion] = parts;
    void currentVersion;
    const releaseUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/releases/latest`;

    const releaseResp = await fetch(releaseUrl, {
      headers: { 'User-Agent': 'devdock-updater/1.0' },
    });

    if (!releaseResp.ok) {
      return new Response(JSON.stringify({ error: 'GitHub API error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const release: GitHubRelease = await releaseResp.json();
    const platformKey = getPlatformKey(target, arch);

    const asset = release.assets.find(
      a => a.name.includes(platformKey) && a.name.endsWith('.tar.gz'),
    );
    const sigAsset = release.assets.find(
      a => a.name.includes(platformKey) && a.name.endsWith('.tar.gz.sig'),
    );

    if (!asset || !sigAsset) {
      return new Response(null, { status: 204 });
    }

    const sigResp = await fetch(sigAsset.browser_download_url);
    const signature = (await sigResp.text()).trim();

    const manifest = {
      version: release.tag_name.replace(/^v/, ''),
      notes: release.body ?? '',
      pub_date: release.published_at,
      platforms: {
        [platformKey]: {
          signature,
          url: asset.browser_download_url,
        },
      },
    };

    return new Response(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS,
      },
    });
  },
};
