module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.js', '.json'],
          alias: {
            '@': './src',
          },
        },
      ],
      // Reanimated插件必须列在最后
      ['react-native-reanimated/plugin'],
    ],
  }
}
