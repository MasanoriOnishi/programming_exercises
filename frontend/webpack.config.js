module.exports = {
  // context: __dirname + "/src",
  entry: {
    javascript: "./src/index.js",
    // html: "./index.html"
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
      // {test: /\.html$/, loader: "file?name=[name].[ext]"}
    ]
  }
}
