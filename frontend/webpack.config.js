
module.exports = {
  // context: __dirname + "/src",
  // entry: {
  //   javascript: "./index.js",
  //   html: "./index.html"
  // },
  // output: {
  //   path: __dirname + "/dist",
  //   filename: "bundle.js"
  // },
    entry: {
        // javascript: "./src/js/index.js",
        app: "./src/index.js"
    },
    output: {
        path: require('path').resolve("../public/js"),
        filename: "[name].js"
    },
    devtool: "inline-source-map",
    module: {
    loaders: [
        {test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"},
        // {test: /\.html$/, loader: "file?name=[name].[ext]"}
    ]
    // loaders: [{
    //   test: /\.css$/,
    //   loader: "style!css"
    // }, {
    //   test: /\.jsx?$/,
    //   exclude: /node_modules/,
    //   loader: 'babel-loader'
    //  }]
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js']
    },
    // resolve: {
    //     extensions: ['.js', '.jsx', '.css']
    // },
}
