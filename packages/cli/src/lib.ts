import { basename, join } from 'path';
import { cwd } from 'process';
import { readFileSync, statSync } from 'fs';

import fetch from 'cross-fetch';
import { globSync } from 'glob';

const pj = require('../package.json');

export const uploadSourcemaps = async ({
  allowNoop,
  apiKey,
  apiUrl,
  basePath,
  path,
  releaseId,
}: {
  allowNoop?: boolean;
  apiKey: string;
  apiUrl?: string;
  basePath?: string;
  path: string;
  releaseId?: string;
}) => {
  if (!apiKey || apiKey === '') {
    if (process.env.HYPERDX_API_ACCESS_KEY) {
      apiKey = process.env.HYPERDX_API_ACCESS_KEY;
    } else {
      throw new Error('api key cannot be empty');
    }
  }

  const backend = apiUrl || 'https://api.hyperdx.io';

  const res = await fetch(join(backend, 'api', 'v1'), {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((e) => {
      console.log(e);
    });

  const teamId = res?.user?.team;
  if (!teamId) {
    throw new Error('invalid api key');
  }

  console.info(`Starting to upload source maps from ${path}`);

  const fileList = await getAllSourceMapFiles([path], { allowNoop });

  if (fileList.length === 0) {
    console.error(
      `Error: No source maps found in ${path}, is this the correct path?`,
    );
    console.info('Failed to upload source maps. Please see reason above.');
    return;
  }

  const uploadKeys = fileList.map(({ name }) => ({
    basePath: basePath || '',
    fullName: name,
    releaseId,
  }));

  const urlRes = await fetch(
    join(backend, 'api', 'v1', 'sourcemaps', 'upload-presigned-urls'),
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        pkgVersion: pj.version,
        keys: uploadKeys,
      }),
    },
  )
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      return data;
    })
    .catch((e) => {
      console.log(e);
    });

  if (!Array.isArray(urlRes?.data)) {
    console.error('Error: Unable to generate source map upload urls.', urlRes);
    console.info('Failed to upload source maps. Please see reason above.');
    return;
  }

  const uploadUrls = urlRes.data;

  await Promise.all(
    fileList.map(({ path, name }, idx) =>
      uploadFile(path, uploadUrls[idx], name),
    ),
  );
};

const NextRouteGroupPattern = new RegExp(/(\(.+?\))\//gm);

async function getAllSourceMapFiles(
  paths: string[],
  { allowNoop }: { allowNoop?: boolean },
) {
  const map: { path: string; name: string }[] = [];

  await Promise.all(
    paths.map(async (path) => {
      const realPath = join(cwd(), path);

      if (statSync(realPath).isFile()) {
        map.push({
          path: realPath,
          name: basename(realPath),
        });

        return;
      }

      if (
        !allowNoop &&
        !globSync('**/*.js.map', {
          cwd: realPath,
          nodir: true,
          ignore: '**/node_modules/**/*',
        }).length
      ) {
        throw new Error(
          'No .js.map files found. Please double check that you have generated sourcemaps for your app.',
        );
      }

      for (const file of globSync('**/*.js?(.map)', {
        cwd: realPath,
        nodir: true,
        ignore: '**/node_modules/**/*',
      })) {
        map.push({
          path: join(realPath, file),
          name: file,
        });
        const routeGroupRemovedPath = file.replaceAll(
          new RegExp(/(\(.+?\))\//gm),
          '',
        );
        if (file !== routeGroupRemovedPath) {
          // also upload the file to a path without the route group for frontend errors
          map.push({
            path: join(realPath, file),
            name: routeGroupRemovedPath,
          });
        }
      }
    }),
  );

  return map;
}

async function uploadFile(filePath: string, uploadUrl: string, name: string) {
  const fileContent = readFileSync(filePath);
  await fetch(uploadUrl, { method: 'put', body: fileContent });
  console.log(`[HyperDX] Uploaded ${filePath} to ${name}`);
}
