module.exports = {
  apps: [{
    name: 'vibejam',
    script: 'npx',
    args: 'tsx server/index.ts',
    cwd: '/var/www/xenozoologist-express',
    env: {
      NODE_ENV: 'production',
      PORT: 7755,
    },
  }],
};
