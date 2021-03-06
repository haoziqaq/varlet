import merge from 'webpack-merge'
import WebpackBarPlugin from 'webpackbar'
import { BASE_CONFIG } from './webpack.base.config'
import { SITE_OUTPUT_PATH, PRIMARY_COLOR } from '../shared/constant'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import { HTML_WEBPACK_PLUGINS } from './webpack.dev.config'

export function getBuildConfig() {
  return merge(BASE_CONFIG as any, {
    mode: 'production',
    output: {
      publicPath: './',
      path: SITE_OUTPUT_PATH,
      filename: 'js/[name].[contenthash:8].js',
      chunkFilename: 'js/[name].[contenthash:8].js',
    },
    plugins: [
      new WebpackBarPlugin({
        name: 'Site production building',
        color: PRIMARY_COLOR,
      }),
      new CleanWebpackPlugin(),
      ...HTML_WEBPACK_PLUGINS,
    ],
  })
}
