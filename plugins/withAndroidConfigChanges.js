/**
 * Config plugin to add smallestScreenSize and density to android:configChanges
 * This prevents activity recreation on foldable devices
 */

const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidConfigChanges = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    
    const activity = manifest.manifest.application[0].activity.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );
    
    if (activity) {
      activity.$['android:configChanges'] = 
        'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|density';
      activity.$['android:windowSoftInputMode'] = 'adjustResize';
    }
    
    return config;
  });
};

module.exports = withAndroidConfigChanges;
