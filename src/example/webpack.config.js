const HtmlWebpackPlugin = require("html-webpack-plugin")
const path = require("path")

module.exports = {
    mode: "development",
    entry: path.resolve(__dirname, "index.tsx"),
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.[hash].js",
    },
    devServer: {
        open: true,
        static: {
            directory: path.join(__dirname, "public"),
        },
    },
    devtool: "inline-source-map",
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "public/index.html"),
    })],
}
