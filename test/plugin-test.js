import assert from 'assert';
import {join} from 'path';
import {rollup} from 'rollup';
import plugin from '../src/index';

function assertIncludes(value, includesString) {
  assert.ok(value.includes(includesString), `

    Expected the document to include the string:

>>>>
${includesString}
<<<<

    Document Contents (truncated):

>>>>
${value.substr(0, 120)}
<<<<`);
}

function assertExcludes(value, excludesString) {
  assert.ok(!value.includes(excludesString), `

    Expected the document to exclude the string:

>>>>
${excludesString}
<<<<

    Document Contents (truncated):

>>>>
${value.substr(0, 120)}
<<<<`);
}

suite('plugin-test', () => {
  let originalCwd;

  suiteSetup(() => {
    originalCwd = process.cwd();
    process.chdir(join(originalCwd, 'test/fixtures/sample-project'));
  });

  suiteTeardown(() => {
    process.chdir(originalCwd);
  });

  test('it resolves and compiles graphql documents', () => {
    return rollup({
      entry: 'src/index.js',
      plugins: [plugin()]
    }).then((bundle) => {
      return bundle.generate({format: 'es'});
    }).then(({code}) => {
      assertIncludes(code, 'const document = client.document();');
      assertIncludes(code, 'document.addQuery("FancyQuery", [client.variable("id", "ID!")], root => {');
    });
  });

  test('it resolves and compiles graphql schemas', () => {
    return rollup({
      entry: 'src/index-with-schema.js',
      plugins: [plugin({schema: 'src/graphql/schema.graphql'})]
    }).then((bundle) => {
      return bundle.generate({format: 'es'});
    }).then(({code}) => {
      assertIncludes(code, 'const document = client.document();');
      assertIncludes(code, 'document.addQuery("FancyQuery", [client.variable("id", "ID!")], root => {');
      assertIncludes(code, 'Types.types["Product"] = Product');
      assertIncludes(code, 'Types.types["Collection"] = Collection');
    });
  });

  test('it resolves and compiles json schemas', () => {
    return rollup({
      entry: 'src/index-with-json-schema.js',
      plugins: [plugin({schema: 'src/graphql/schema.json'})]
    }).then((bundle) => {
      return bundle.generate({format: 'es'});
    }).then(({code}) => {
      assertIncludes(code, 'const document = client.document();');
      assertIncludes(code, 'document.addQuery("FancyQuery", [client.variable("id", "ID!")], root => {');
      assertIncludes(code, 'Types.types["Product"] = Product');
      assertIncludes(code, 'Types.types["Collection"] = Collection');
    });
  });

  test('it resolves fragments from files outside documents', () => {
    return rollup({
      entry: 'src/index-with-shared-fragments.js',
      plugins: [plugin()]
    }).then((bundle) => {
      return bundle.generate({format: 'es'});
    }).then(({code}) => {
      assertIncludes(code, 'const document = client.document();');
      assertIncludes(code, 'document.addQuery("FancyQuery", [client.variable("id", "ID!")], root => {');
      assertIncludes(code, 'document.defineFragment("ProductFragment", "Product"');
    });
  });

  test('it resolves fragment files from other fragment files', () => {
    return rollup({
      entry: 'src/index-with-fragments-in-fragments.js',
      plugins: [plugin()]
    }).then((bundle) => {
      return bundle.generate({format: 'es'});
    }).then(({code}) => {
      assertIncludes(code, 'const document = client.document();');
      assertIncludes(code, 'document.addQuery("FancyQuery", [client.variable("id", "ID!")], root => {');
      assertIncludes(code, 'document.defineFragment("ProductFragmentNested", "Product"');
      assertIncludes(code, 'document.defineFragment("ProductFragment", "Product"');
    });
  });

  test('it resolves, compiles, and optimizes graphql schemas', () => {
    return rollup({
      entry: 'src/index-with-schema.js',
      plugins: [plugin({
        schema: 'src/graphql/schema.graphql',
        optimize: true,
        profileDocuments: ['src/graphql/**/*.graphql']
      })]
    }).then((bundle) => {
      return bundle.generate({format: 'es'});
    }).then(({code}) => {
      assertIncludes(code, 'const document = client.document();');
      assertIncludes(code, 'document.addQuery("FancyQuery", [client.variable("id", "ID!")], root => {');
      assertIncludes(code, 'Types.types["Product"] = Product');
      assertExcludes(code, 'Types.types["Collection"] = Collection');
    });
  });
});
