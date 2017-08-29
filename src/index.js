import {readFile} from 'fs';
import {resolve as resolvePath} from 'path';
import {createFilter} from 'rollup-pluginutils';
import {
  compileToModule,
  compileSchemaJson,
  compileSchemaIDL,
  compileOptimizedSchemaJson,
  compileOptimizedSchemaIDL,
  fragmentFilesForDocument
} from 'graphql-js-client-compiler';
import glob from 'glob';

function hasGraphQLExtension(id) {
  return Boolean(id.match(/\.graphql$/i));
}

function isJson(source) {
  try {
    JSON.parse(source);

    return true;
  } catch (_) {
    return false;
  }
}

function globPaths(paths) {
  return Promise.all(paths.map((path) => {
    return new Promise((resolve, reject) => {
      glob(resolvePath(path), (error, files) => {
        if (error) {
          reject(error);
        } else {
          resolve(files);
        }
      });
    });
  })).then((globResults) => {
    return globResults.reduce((results, currentGlob) => {
      return results.concat(currentGlob);
    }, []);
  });
}

function readFiles(files) {
  return Promise.all(files.map((file) => {
    return new Promise((resolve, reject) => {
      readFile(file, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            body: data.toString(),
            path: file
          });
        }
      });
    });
  }));
}

function optimizeAndCompileSchema({schema, profileDocuments, compiler}) {
  return globPaths(profileDocuments).then((files) => {
    return readFiles(files);
  }).then((documents) => {
    return Promise.all(documents.map((document) => {
      return prependFragments(document.body, document.path);
    }));
  }).then((concatenatedDocuments) => {
    return compiler(schema, {documents: concatenatedDocuments});
  });
}

function prependFragments(source, id) {
  return recursivelySourceFragmentFiles(source, id).then((fragments) => {
    return source.concat(fragments.map((fragment) => fragment.body).join('\n'));
  });
}

function recursivelySourceFragmentFiles(source, id) {
  const fragmentFiles = fragmentFilesForDocument(id, source);

  if (fragmentFiles.length === 0) {
    return Promise.resolve([]);
  }

  return readFiles(fragmentFiles).then((fragments) => {
    return Promise.all(fragments.map((fragment) => {
      return recursivelySourceFragmentFiles(fragment.body, fragment.path);
    }).concat(Promise.resolve(fragments)));
  }).then((fragmentLists) => {
    return fragmentLists.reduce((acc, fragments) => {
      return acc.concat(fragments);
    }, []);
  }).then((fragments) => {
    return fragments.reduce((acc, fragment) => {
      if (!acc.find((uniqueFragment) => uniqueFragment.path === fragment.path)) {
        acc.push(fragment);
      }

      return acc;
    }, []);
  });
}

export default function plugin({schema, optimize, profileDocuments, include, exclude} = {}) {
  const filter = createFilter(include, exclude);
  const schemaPath = resolvePath(schema || '');

  function isSchema(id) {
    if (!schema || id !== schemaPath) {
      return false;
    }

    return true;
  }

  return {
    name: 'graphql-js-client-compiler',
    transform(source, id) {
      if (!filter(id)) {
        return;
      }

      if (isSchema(id)) {
        if (optimize) {
          const opts = {
            schema: source,
            profileDocuments
          };

          if (isJson(source)) {
            opts.compiler = compileOptimizedSchemaJson;
          } else {
            opts.compiler = compileOptimizedSchemaIDL;
          }

          return optimizeAndCompileSchema(opts);
        } else if (isJson(source)) {
          return compileSchemaJson(source);
        } else {
          return compileSchemaIDL(source);
        }
      } else if (hasGraphQLExtension(id)) {
        return prependFragments(source, id).then((concatenatedSource) => {
          return compileToModule(concatenatedSource);
        });
      }
    }
  };
}
