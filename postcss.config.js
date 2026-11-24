module.exports = (ctx) => ({
  map: ctx.options?.map,
  plugins: {
    // Inline the @import manifest (main.css) into a single stylesheet.
    "postcss-import": {},
    // Copy referenced assets to the output and rebase their url()s. Required because
    // component CSS in subdirectories references icons/images with paths relative to
    // themselves, which must be rewritten when inlined into main.css.
    "postcss-url": { url: "copy" },
    // Add vendor prefixes per the Baseline browserslist.
    autoprefixer: {},
    // Minify the resulting main.min.css.
    cssnano: {},
  },
});
