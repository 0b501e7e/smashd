// Use APP_VARIANT as recommended by Expo docs
const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

// Function to get the right config file based on APP_VARIANT
const getConfig = () => {
  if (IS_DEV) {
    return require('./app.config.development.js');
  }
  
  if (IS_PREVIEW) {
    // For now, use production config for preview
    return require('./app.config.production.js');
  }
  
  // Default to production
  return require('./app.config.production.js');
};

module.exports = getConfig(); 