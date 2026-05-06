module.exports = {
  '**/*.{ts,tsx}': (files) => {
    const cmds = [`prettier --write --ignore-unknown ${files.join(' ')}`];

    // These packages do not have an eslint config yet
    const lintable = files.filter(
      (f) =>
        !f.includes('/packages/otel-web/') &&
        !f.includes('/packages/session-recorder/'),
    );

    if (lintable.length) {
      cmds.push(`eslint --fix ${lintable.join(' ')}`);
    }

    return cmds;
  },

  '**/*.{json,yml}': 'prettier --write --ignore-unknown',
};
