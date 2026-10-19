const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => {
  const mode = argv.mode === 'production' ? 'prod' : 'dev';
  const maxAssetSize = mode === 'prod' ? 360000 : 1512000;
  return {
    target: ['web', 'es2020'],
    entry: {
      index: path.resolve(__dirname, 'src/index.js'),
    },
    resolve: {
      alias: {
        'react-intl$': path.resolve(__dirname, 'src/lib/react-intl-compat.js'),
        'react-intl-original$': path.resolve(__dirname, 'node_modules/react-intl'),
        '@': path.resolve(__dirname, 'src/workspace'),
      },
    },
    devtool: 'source-map',
    module: {
      strictExportPresence: true,
      rules: [
        {
          test: /\.jsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                envName: mode === 'prod' ? 'production' : 'development',
              },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, 'umd'),
      filename: `[name].${mode}.js`,
      publicPath: 'auto',
      module: true
    },
    experiments: {
      outputModule: true,
    },
    optimization: {
      runtimeChunk: 'single',
      minimize: (mode === 'prod'),
      minimizer: ['...']
    },
    performance: {
      maxEntrypointSize: maxAssetSize,
      maxAssetSize: maxAssetSize,
      assetFilter: function(assetFilename) {
        // Exclude all sourcemaps
        if (/\.map$/.test(assetFilename)) {
          return false;
        }
        return true;
      },
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: `node_modules/tinode-sdk/umd/tinode.${mode}.js`, to: `tinode.${mode}.js`, transform: content => {
            const source=content.toString();
            const matches=source.match(/(["'])tinode-web\1/g)||[];
            if(matches.length!==1)throw new Error('Pinned SDK cache adapter changed; review before building');
            const inserts=source.match(/\.objectStore\((["'])message\1\)\.add\(/g)||[];
            if(inserts.length!==1)throw new Error('Pinned SDK idempotent cache adapter changed; review before building');
            return source.replace(/(["'])tinode-web\1/g,'("oneworkspace.chat.v2.cache."+globalThis.workspaceChat.accountKey)')
              .replace(/(\.objectStore\((["'])message\2\))\.add\(/g,'$1.put(');
          } },
          { from: `node_modules/tinode-sdk/umd/tinode.${mode}.js.map`, to: `tinode.${mode}.js.map` },
        ],
      }),
    ],
    externalsType: 'var',
    externals: {'livekit-client': 'LivekitClient', 'tinode-sdk': 'tinode'},
  };
}
