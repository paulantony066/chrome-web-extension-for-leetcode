import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'LeetCode Duel & RPG Companion',
  version: '1.0.0',
  description: 'Gamify your DSA practice with real-time duels and boss raids.',

  action: {
    default_popup: 'index.html',
  },

  content_scripts: [
    {
      matches: ['https://leetcode.com/problems/*'],
      js: ['src/content/index.tsx'],
    },
  ],

  web_accessible_resources: [
    {
      resources: ['pngwing.com.png','animation.png','aang_idle.png','aang_swing.png','aang_happy.png','aang_idle2.png',"fantasy_warrior/*.png"],
      matches: ['https://leetcode.com/*'],
    },
  ],
})