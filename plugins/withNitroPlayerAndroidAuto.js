const { withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE_NAME = 'com.margelo.nitro.nitroplayer.media.NitroPlayerMediaBrowserService';

function withAutomotiveAppDesc(config) {
  return withAndroidManifest(config, (config) => {
    const resDir = path.join(
      config.modRequest.platformProjectRoot,
      'app',
      'src',
      'main',
      'res'
    );
    const xmlDir = path.join(resDir, 'xml');
    if (!fs.existsSync(xmlDir)) {
      fs.mkdirSync(xmlDir, { recursive: true });
    }
    const descPath = path.join(xmlDir, 'automotive_app_desc.xml');
    if (!fs.existsSync(descPath)) {
      fs.writeFileSync(
        descPath,
        '<?xml version="1.0" encoding="utf-8"?>\n<automotiveApp>\n  <uses name="media" />\n</automotiveApp>\n'
      );
    }
    return config;
  });
}

const withNitroPlayerAndroidAuto = (config) => {
  config = withAutomotiveAppDesc(config);

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const perms = manifest['uses-permission'].map(
      (p) => p.$['android:name']
    );

    for (const perm of [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.POST_NOTIFICATIONS',
    ]) {
      if (!perms.includes(perm)) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    const application = manifest.application[0];

    if (!application.service) {
      application.service = [];
    }

    const exists = application.service.some(
      (s) => s.$['android:name'] === SERVICE_NAME
    );

    if (!exists) {
      application.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:exported': 'true',
          'android:foregroundServiceType': 'mediaPlayback',
          'tools:ignore': 'ExportedService',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.media.browse.MediaBrowserService',
                },
              },
            ],
          },
        ],
      });
    }

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const hasCarMeta = application['meta-data'].some(
      (m) => m.$['android:name'] === 'com.google.android.gms.car.application'
    );

    if (!hasCarMeta) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.car.application',
          'android:resource': '@xml/automotive_app_desc',
        },
      });
    }

    return config;
  });
};

module.exports = withNitroPlayerAndroidAuto;
