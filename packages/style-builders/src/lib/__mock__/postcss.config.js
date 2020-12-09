/* eslint-disable no-undef, @typescript-eslint/no-var-requires */
module.exports = () => ({
  map: { inline: false },
  plugins: [
    require("postcss-preset-env")()
  ]
});
