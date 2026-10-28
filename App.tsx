import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Picker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';

type Story = { id: string; person: string; note: string; audio?: string; x: number; y: number };
type Photo = { id: string; title: string; uri: string; ratio: number; stories: Story[] };
const key = 'beyond-the-frame-v1';
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const colors = { cream: '#F8F3EB', ink: '#382D29', rose: '#AA6263', green: '#35766B', muted: '#81766C' };

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<'home' | 'archive' | 'photo' | 'record' | 'saved'>('home');
  const [selected, setSelected] = useState<string>();
  const [person, setPerson] = useState('');
  const [note, setNote] = useState('');
  const [audio, setAudio] = useState<string>();
  const [point, setPoint] = useState({ x: .5, y: .5 });
  const [perspective, setPerspective] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [photoWidth, setWidth] = useState(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const playback = useAudioPlayerStatus(player);
  const photo = photos.find(p => p.id === selected);
  useEffect(() => { AsyncStorage.getItem(key).then(raw => {
    if (raw) { const data: unknown = JSON.parse(raw); if (!Array.isArray(data)) throw new Error('Invalid archive'); setPhotos(data); }
    setReady(true);
  }).catch(() => Alert.alert('Archive could not open', 'Restart the app to retry. Existing data has not been overwritten.')); }, []);

  async function persist(next: Photo[]) { await AsyncStorage.setItem(key, JSON.stringify(next)); setPhotos(next); }
  function navigate(next: typeof screen) { player.pause(); setPerspective(undefined); setScreen(next); }
  async function addPhoto(camera = false) {
    if (!ready || busy) return;
    setBusy(true);
    try {
      if (camera && !(await Picker.requestCameraPermissionsAsync()).granted) { Alert.alert('Camera access needed', 'Allow camera access in iPhone Settings, or upload a photo instead.'); return; }
      const result = camera ? await Picker.launchCameraAsync({ quality: .8 }) : await Picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .8 });
      if (result.canceled) return;
      const asset = result.assets[0]; const id = uid();
      const target = new File(Paths.document, `${id}.jpg`); new File(asset.uri).copy(target);
      await persist([{ id, title: 'An untold story', uri: target.uri, ratio: asset.width / asset.height, stories: [] }, ...photos]);
      setSelected(id); navigate('photo');
    } catch { Alert.alert('Could not add photo', 'Your photo was not saved. Please try again.'); }
    finally { setBusy(false); }
  }
  async function toggleRecording() {
    try {
      if (recording.isRecording) { await recorder.stop(); setAudio(recorder.uri ?? undefined); return; }
      if (!(await AudioModule.requestRecordingPermissionsAsync()).granted) { Alert.alert('Microphone access needed', 'Allow microphone access in iPhone Settings. You can still save a written memory.'); return; }
      player.pause();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(); recorder.record();
    } catch { Alert.alert('Recording unavailable', 'Please try again or write your memory below.'); }
  }
  async function listen(uri: string, id: string) {
    try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); player.replace(uri); player.play(); setPerspective(id); }
    catch { Alert.alert('Could not play audio', 'The recording may be unavailable.'); }
  }
  async function saveStory() {
    if (!photo || !person.trim() || (!note.trim() && !audio) || busy || recording.isRecording) return;
    setBusy(true);
    try {
      let storedAudio: string | undefined;
      if (audio) { const target = new File(Paths.document, `${uid()}.m4a`); new File(audio).copy(target); storedAudio = target.uri; }
      const story = { id: uid(), person: person.trim(), note: note.trim(), audio: storedAudio, ...point };
      await persist(photos.map(p => p.id === photo.id ? { ...p, stories: [...p.stories, story] } : p));
      navigate('saved');
    } catch { Alert.alert('Memory not saved', 'Please try again.'); }
    finally { setBusy(false); }
  }
  function beginMemory() { setPerson(''); setNote(''); setAudio(undefined); setPoint({ x: .5, y: .5 }); navigate('record'); }
  const button = (title: string, action: () => void, secondary = false, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button, secondary && s.secondary, disabled && { opacity: .4 }]}><Text style={[s.buttonText, secondary && { color: colors.ink }]}>{title}</Text></Pressable>;

  return <SafeAreaView style={s.safe}><StatusBar style="dark" /><View style={s.header}><Text style={s.brand}>Beyond the Frame</Text><Text style={s.edition}>A LIVING ARCHIVE</Text></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {screen !== 'home' && button('‹  Back', () => navigate(screen === 'record' || screen === 'saved' ? 'photo' : 'home'), true, recording.isRecording)}
      {screen === 'home' && <>
        <Text style={s.eyebrow}>PRESERVE · LISTEN · REMEMBER</Text><Text style={s.hero}>Beyond{ '\n' }the Frame</Text><Text style={s.subtitle}>One photograph,{ '\n' }multiple memories.</Text>
        <View style={s.heroCard}>{photos[0] ? <Image source={{ uri: photos[0].uri }} style={s.heroImage} /> : <View style={s.emptyArt}><Text style={{ fontSize: 64 }}>▧</Text><Text style={s.serif}>A moment worth keeping.</Text></View>}<Text style={s.cardCaption}>The photograph is only the beginning.</Text></View>
        {button(busy ? 'Opening…' : '+  Add a memory', () => addPhoto(), false, !ready || busy)}
        {button('◎  Photograph a printed photo', () => addPhoto(true), true, !ready || busy)}
        {button(`▧  My archive  ·  ${photos.length}`, () => navigate('archive'), true, !ready)}
        <Text style={s.small}>Private by design. Photos and recordings are saved on this iPhone. Deleting the app may remove them.</Text>
      </>}
      {screen === 'archive' && <><Text style={s.hero}>Your archive</Text><Text style={s.subtitle}>Small moments. Lasting voices.</Text>{photos.length === 0 && <Text style={s.small}>Your archive is waiting for its first photograph.</Text>}{photos.map(p => <Pressable key={p.id} onPress={() => { setSelected(p.id); navigate('photo'); }} style={s.archiveCard}><Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: p.ratio, borderRadius: 10 }} /><Text style={s.serif}>{p.title}</Text><Text style={s.small}>{p.stories.length} perspectives  →</Text></Pressable>)}{button('+ Add a photograph', () => addPhoto(), false, busy)}</>}
      {screen === 'photo' && photo && <>
        <Text style={s.eyebrow}>EXPLORE MEMORIES</Text><Text style={s.hero}>{photo.title}</Text>
        <View style={{ width: '100%', aspectRatio: photo.ratio }}><Image source={{ uri: photo.uri }} style={s.photo} />{photo.stories.map((story, i) => <Pressable key={story.id} accessibilityLabel={`Explore ${story.person}'s memory`} onPress={() => { setPerspective(story.id); if (story.audio) listen(story.audio, story.id); }} style={[s.marker, { left: `${story.x * 100}%`, top: `${story.y * 100}%`, backgroundColor: i % 2 ? colors.green : colors.rose }]}><Text style={{ color: 'white' }}>{i + 1}</Text></Pressable>)}</View>
        <Text style={s.small}>Tap a marker to discover a perspective. This Expo Go version explores a saved photo; live AR tracking is planned for a custom build.</Text>
        {photo.stories.map(story => <View key={story.id} style={[s.story, perspective === story.id && { borderColor: colors.rose }]}><View style={s.row}><Text style={s.serif}>{story.person}</Text>{story.audio && <Pressable accessibilityLabel={`Play ${story.person}'s recording`} onPress={() => listen(story.audio!, story.id)}><Text style={{ color: colors.rose, fontSize: 26 }}>▶</Text></Pressable>}</View><Text style={s.body}>{story.note || 'A voice from this moment.'}</Text></View>)}
        {playback.playing && button('Ⅱ  Pause story', () => player.pause(), true)}
        {photo.stories.length === 0 && <Text style={s.subtitle}>Who remembers this moment?</Text>}
        {button('+ Add a perspective', beginMemory)}
      </>}
      {screen === 'record' && photo && <>
        <Text style={s.eyebrow}>PRESERVE MEMORIES</Text><Text style={s.hero}>Every voice{ '\n' }adds a story.</Text>
        <Text style={s.label}>1. Identify a person or object</Text><TextInput value={person} onChangeText={setPerson} placeholder="Mum, Sister, the plush toy…" style={s.input} maxLength={80} />
        <Text style={s.label}>2. Tap where this memory belongs</Text>
        <View style={{ aspectRatio: photo.ratio }} onTouchEnd={e => { const { locationX, locationY } = e.nativeEvent; if (photoWidth > 0) setPoint({ x: Math.max(.04, Math.min(.96, locationX / photoWidth)), y: Math.max(.04, Math.min(.96, locationY / (photoWidth / photo.ratio))) }); }} onLayout={e => setPhotoWidth(e.nativeEvent.layout.width)}><Image source={{ uri: photo.uri }} style={s.photo} /><View pointerEvents="none" style={[s.marker, { left: `${point.x * 100}%`, top: `${point.y * 100}%` }]}><Text style={{ color: 'white' }}>+</Text></View></View>
        <Text style={s.label}>3. Record or write the memory</Text>
        {button(recording.isRecording ? `■  Stop · ${Math.floor(recording.durationMillis / 1000)}s` : audio ? '●  Record again' : '●  Record a voice memory', toggleRecording, true)}
        {audio && !recording.isRecording && button('▶ Listen to recording', () => listen(audio, 'draft'), true)}
        <TextInput value={note} onChangeText={setNote} placeholder="I remember this day… Add a written memory or a caption for your recording." multiline style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]} />
        {button(busy ? 'Saving…' : 'Save to archive', saveStory, false, busy || recording.isRecording || !person.trim() || (!note.trim() && !audio))}
      </>}
      {screen === 'saved' && <View style={{ alignItems: 'center', gap: 24, paddingVertical: 35 }}><Text style={{ color: colors.green, fontSize: 64 }}>✓</Text><Text style={s.hero}>Memory saved.</Text><Text style={s.subtitle}>A voice preserved.{ '\n' }A photograph made richer.</Text>{photo && <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: photo.ratio, borderRadius: 12 }} />}{button('Explore this photograph', () => navigate('photo'))}{button('Add another memory', beginMemory, true)}</View>}
    </ScrollView>
    {screen !== 'record' && <View style={s.nav}>{(['home', 'archive'] as const).map(tab => <Pressable key={tab} accessibilityRole="button" onPress={() => navigate(tab)} style={{ padding: 14 }}><Text style={{ color: screen === tab ? colors.rose : colors.muted }}>{tab === 'home' ? '⌂  Home' : '▧  Archive'}</Text></Pressable>)}<Text style={s.navNote}>Made of memories.</Text></View>}
  </SafeAreaView>;
  function setPhotoWidth(value: number) { setWidth(value); }
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#E8DED2' },
  brand: { fontFamily: 'Georgia', fontSize: 17, color: colors.ink }, edition: { fontSize: 8, letterSpacing: 2, color: colors.muted },
  content: { padding: 24, gap: 18, paddingBottom: 40 }, eyebrow: { fontSize: 10, letterSpacing: 2.5, color: colors.rose, marginTop: 15 },
  hero: { fontFamily: 'Georgia', fontSize: 43, lineHeight: 48, color: colors.ink }, subtitle: { fontFamily: 'Georgia', fontSize: 20, fontStyle: 'italic', lineHeight: 28, color: colors.muted },
  heroCard: { backgroundColor: '#EADBD0', padding: 18, borderRadius: 16, marginVertical: 12 }, heroImage: { width: '100%', height: 220, transform: [{ rotate: '-3deg' }], borderWidth: 7, borderColor: '#FFFCF7' },
  emptyArt: { height: 200, backgroundColor: '#F1E6D8', alignItems: 'center', justifyContent: 'center', gap: 14, transform: [{ rotate: '-3deg' }], borderWidth: 7, borderColor: '#FFFCF7' },
  cardCaption: { textAlign: 'center', fontFamily: 'Georgia', fontStyle: 'italic', color: colors.muted, marginTop: 20, fontSize: 12 },
  button: { backgroundColor: colors.ink, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 13, alignItems: 'center', width: '100%' }, secondary: { backgroundColor: '#EEE5DA' }, buttonText: { color: '#FFF9F1', fontSize: 14, fontWeight: '600' },
  small: { fontSize: 12, lineHeight: 19, color: colors.muted }, serif: { fontFamily: 'Georgia', fontSize: 21, color: colors.ink },
  archiveCard: { backgroundColor: '#FFF9F2', padding: 14, borderRadius: 16, gap: 12 }, photo: { width: '100%', height: '100%', borderRadius: 12 },
  marker: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderColor: '#FFF9F1', borderWidth: 3, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -18 }, { translateY: -18 }] },
  story: { padding: 18, gap: 12, borderWidth: 1, borderColor: '#E8DED2', backgroundColor: '#FFFAF3', borderRadius: 14 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, body: { fontSize: 15, lineHeight: 24, color: colors.ink },
  label: { fontSize: 13, color: colors.ink, fontWeight: '600', marginTop: 10 }, input: { backgroundColor: '#FFFAF3', borderWidth: 1, borderColor: '#E8DED2', padding: 16, borderRadius: 12, fontSize: 16, color: colors.ink },
  nav: { borderTopWidth: 1, borderColor: '#E8DED2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 }, navNote: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 11, color: colors.muted },
});
