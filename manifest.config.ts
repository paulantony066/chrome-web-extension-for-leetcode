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
})