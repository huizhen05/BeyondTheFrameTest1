# Beyond the Frame

An iPhone-first Expo app inspired by the supplied memory preservation flow: one photograph, multiple memories. Cream paper tones, serif typography, rose recording controls, and a personal archive.

## Open on your iPhone

Install Node.js 22 LTS and Expo Go. Download this project to your computer, open a terminal in its folder, and run:

```sh
npm ci
npm start
```

Keep your computer and iPhone on the same Wi-Fi. Scan the terminal QR code with the iPhone Camera and open it in Expo Go. Use an Expo Go version compatible with Expo SDK 54. If your installed Expo Go requires a newer SDK, upgrade the project using Expo's SDK upgrade guide before running it. A cloud machine's LAN QR code is generally not reachable from your phone; run locally for this workflow.

## Try the flow

1. Add a photo from your library, or photograph a printed photo.
2. Open the photo and choose **Add a perspective**.
3. Name the person or object and tap their position on the photograph.
4. Record a voice memory (stop recording before saving), write a memory, or do both.
5. Save, explore the photo, and tap a numbered marker to hear its story.
6. Add another person's perspective to compare accounts. Restart the app and check the archive is retained.

Camera and microphone access require permission. Written memories work without microphone access. Recordings require keeping the app open. Playback works in silent mode.

## Scope

This is a functional local prototype, not yet a live AR tracker. Expo Go does not include native ARKit image tracking. The photograph view has photo-relative markers; capturing a photo does not recognize it or match it to the archive. Native tracking needs a custom iOS development build and a separate AR implementation. There is no AI identification, automatic transcription, cloud backup, or account system. Written captions are entered manually.

Photos and audio are copied into app document storage; the archive index is in AsyncStorage. Uninstalling Expo Go or clearing its data can delete memories. Do not use this prototype as the only copy of irreplaceable recordings. Export/backup and archive editing/deletion are future work.

## Development

```sh
npm run typecheck
EXPO_NO_TELEMETRY=1 npx expo export --platform ios
```

Type checks and bundling do not verify iPhone permissions, audio recording/playback, or camera behavior. Complete the flow above on a physical iPhone before relying on it.

Use the existing checkout in cloud tasks; do not create a worktree unless requested. No secrets or backend are required.
