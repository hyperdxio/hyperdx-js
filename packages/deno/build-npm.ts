import { build, emptyDir } from 'https://deno.land/x/dnt/mod.ts';

async function getJson(filePath: string) {
  return JSON.parse(await Deno.readTextFile(filePath));
}

const BUILD_DIR = './build';

// Read package.json
const pkg = await getJson('./package.json');

console.log('Cleaning build directory...');
await emptyDir(BUILD_DIR);

console.log('Building...');
await build({
  entryPoints: ['./mod.ts'],
  outDir: BUILD_DIR,
  test: false,
  typeCheck: false, // addEventListener type error
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    name: pkg.name,
    version: pkg.version,
    license: pkg.license,
    homepage: pkg.homepage,
    repository: pkg.repository,
    publishConfig: pkg.publishConfig,
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync('LICENSE', `${BUILD_DIR}/LICENSE`);
    Deno.copyFileSync('README.md', `${BUILD_DIR}/README.md`);
    Deno.writeTextFile(`${BUILD_DIR}/.npmignore`, 'node_modules', {
      append: true,
    });
  },
});
