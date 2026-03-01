const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withGoogleCastFix(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    
    const resolutionStrategy = `
    configurations.all {
        resolutionStrategy {
            force 'com.google.android.gms:play-services-cast-framework:21.3.0'
            force 'com.google.android.gms:play-services-cast:21.3.0'
        }
    }
`;

    if (!contents.includes('play-services-cast-framework:21.3.0')) {
      config.modResults.contents = contents.replace(
        /android\s*\{/,
        `android {${resolutionStrategy}`
      );
    }
    
    return config;
  });
};
