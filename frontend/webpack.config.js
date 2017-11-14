module.exports = {
  entry: {
    javascript: "./src/index.js",
  },
  output: {
    path: require('path').resolve("../public/js"),
    filename: "bundle.js"
  },
  devtool: "inline-source-map",
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  }
}
