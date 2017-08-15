[![CircleCI](https://circleci.com/gh/Shopify/rollup-plugin-graphql-js-client-compiler.svg?style=svg)](https://circleci.com/gh/Shopify/rollup-plugin-graphql-js-client-compiler)

# rollup-plugin-graphql-js-client-compiler

Converts GraphQL files and schema definitions into ES Modules for use with the [graphql-js-client](https://github.com/Shopify/graphql-js-client) during build time, using rollup and [graphql-js-client-compiler](https://github.com/Shopify/graphql-js-client-compiler).

# Usage

### Development

Transform any `.graphql` file (including schema definitions) into js client query builder syntax for use with [graphql-js-client](https://github.com/Shopify/graphql-js-client).

```javascript
// rollup.config.js
import {rollup} from 'rollup';
import graphqlCompiler from 'rollup-plugin-graphql-js-client-compiler';

export default {
  entry: 'main.js',
  dest: 'bundle.js',
  moduleName: 'myModule',
  format: 'cjs',
  plugins: [
    graphqlCompiler({
      schema: 'graphql/schema.graphql'
    })
  ]
}

// main.js
import query from './graphql/query.graphql';
import types from './graphql/schema.graphql';
import Client from 'graphql-js-client';

const client = new Client(types, {url: 'https://api.myproject.org'});

client.send(query, {someVariable: 'value'}).then(({data, model}) => {
  // do stuff
});
```

__NOTE:__ The schema can be an IDL file with the `.graphql` extension, or an introspection response in JSON format with the `.json` extension.

This will include the entire schema, as represented with [graphql-js-schema](https://github.com/Shopify/graphql-js-schema).

### Production

For production builds, make sure to optimize the schema, only including fields that actually used in graphql documents. Often, the entire schema is not used by a single application. To enable optimization, tweak your config as follows:


```javascript
// rollup.config.js
import {rollup} from 'rollup';
import graphqlCompiler from 'rollup-plugin-graphql-js-client-compiler';

export default {
  entry: 'main.js',
  dest: 'bundle.js',
  moduleName: 'myModule',
  format: 'cjs',
  plugins: [
    graphqlCompiler({
      schema: 'graphql/schema.graphql',
      optimize: true,
      profileDocuments: ['graphql/**/*.graphql']
    })
  ]
}
```

The `profileDocuments` option should be an array of minimatch patterns that match all queries included in your application or library.

__NOTE:__ Profiling makes the compilation of the schema slower. It is advised to only use this option in production.
