const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getConfig = ({ config }) => {
  console.log('📦 APP_VARIANT:', process.env.APP_VARIANT);
  console.log('📦 NODE_ENV:', process.env.NODE_ENV);

  if (IS_DEV) {
    console.log('✅ Loading development config');
    const devConfig = require('./app.config.development.js');
    return devConfig({ config });
  }

  if (IS_PREVIEW) {
    console.log('✅ Loading preview config');
    const previewConfig = require('./app.config.production.js');
    return previewConfig({ config });
  }

  console.log('✅ Loading production config');
  const prodConfig = require('./app.config.production.js');
  return prodConfig({ config });
};

module.exports = getConfig;