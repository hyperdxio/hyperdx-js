module.exports = {
  '**/*.{ts,tsx}': (files) => {
    const cmds = [`prettier --write --ignore-unknown ${files.join(' ')}`];

    // `otel-web` package does not have an eslint config yet
    const lintable = files.filter((f) => !f.includes('/packages/otel-web/'));

    if (lintable.length) {
      cmds.push(`eslint --fix ${lintable.join(' ')}`);
    }

    return cmds;
  },

  '**/*.{json,yml}': 'prettier --write --ignore-unknown',
};
