const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/extension.ts',
  target: 'node',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  output: {
    filename: 'extension.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs'
  },
  externals: {
    vscode: 'commonjs vscode'
  }
};
