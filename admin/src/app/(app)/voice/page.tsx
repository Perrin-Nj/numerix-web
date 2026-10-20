'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUI } from '@/lib/store';
import { Badge, Button, Card, Input, PageTitle, Select, Switch } from '@/components/ui';
import { encodeWav, normalise, peakDb, rmsDb, toBase64, trimSilence, type VoiceExport } from '@/lib/voiceDsp';

type Line = { id: string; lang: 'fr-CA' | 'en-CA'; text: string; direction?: string; maxSec?: number };
type Take = { wav: Uint8Array; rate: number; seconds: number; url: string; rms: number; peak: number };

const L = {
  fr: {
    title: 'Enregistreur de voix',
    sub: 'Lis une ligne du script, enregistre, vérifie, puis exporte. Les clips sans consentement sont refusés.',
    script: 'Fichier script.json (numerix-api/seed/voice)',
    lang: 'Langue',
    search: 'Chercher une ligne',
    line: 'Ligne',
    manualId: 'Ou identifiant libre',
    manualText: 'Texte lu',
    rec: 'Enregistrer',
    stop: 'Arrêter',
    again: 'Refaire',
    preview: 'Écouter',
    stats: 'Après coupe du silence et volume: {s} s, niveau {r} dBFS, crête {p} dBFS',
    talent: 'Nom de la personne qui parle',
    consent: 'Cette personne a donné son consentement (voir texte ci-dessous)',
    release: 'Texte de la décharge (conservé avec le clip)',
    releaseDefault:
      "J'autorise Numerix à utiliser ma voix enregistrée dans l'application pour enfants, en français canadien ou en anglais canadien, sans limite de durée, et je peux demander le retrait de mes clips.",
    add: "Ajouter à l'export",
    queue: 'Clips prêts',
    export: "Télécharger l'export",
    note: "Le serveur n'accepte pas encore les voix (POST /assets répond 501): l'export est un fichier JSON. Ensuite: node scripts/import-voice-export.mjs fichier.json dans le dépôt frontend.",
    nomic: 'Micro refusé ou introuvable.',
    silent: 'Rien ne s\'entend: refais la prise.',
  },
  en: {
    title: 'Voice recorder',
    sub: 'Read a script line, record, check, then export. Clips without consent are refused.',
    script: 'script.json file (numerix-api/seed/voice)',
    lang: 'Language',
    search: 'Find a line',
    line: 'Line',
    manualId: 'Or free id',
    manualText: 'Text read',
    rec: 'Record',
    stop: 'Stop',
    again: 'Redo',
    preview: 'Listen',
    stats: 'After silence trim and loudness: {s} s, level {r} dBFS, peak {p} dBFS',
    talent: 'Name of the person speaking',
    consent: 'This person gave consent (see text below)',
    release: 'Release text (stored with the clip)',
    releaseDefault:
      "I allow Numerix to use my recorded voice in the children's app, in Canadian French or Canadian English, with no time limit, and I can ask for my clips to be removed.",
    add: 'Add to export',
    queue: 'Clips ready',
    export: 'Download export',
    note: 'The server does not accept voices yet (POST /assets answers 501): the export is a JSON file. Then run node scripts/import-voice-export.mjs file.json in the frontend repo.',
    nomic: 'Microphone refused or not found.',
    silent: 'Nothing audible: record again.',
  },
} as const;

export default function VoicePage() {
  const locale = useUI((s) => s.locale);
  const t = L[locale === 'en' ? 'en' : 'fr'];
  const [lines, setLines] = useState<Line[]>([]);
  const [lang, setLang] = useState<'fr-CA' | 'en-CA'>('fr-CA');
  const [q, setQ] = useState('');
  const [lineId, setLineId] = useState('');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [take, setTake] = useState<Take | null>(null);
  const [err, setErr] = useState('');
  const [talent, setTalent] = useState('');
  const [consent, setConsent] = useState(false);
  const [release, setRelease] = useState<string>(L.fr.releaseDefault);
  const [queue, setQueue] = useState<VoiceExport['clips']>([]);
  const mr = useRef<MediaRecorder | null>(null);
  const url = take?.url;
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  const current = lines.find((l) => l.id === lineId && l.lang === lang);
  const shown = useMemo(
    () => lines.filter((l) => l.lang === lang && (!q || `${l.id} ${l.text}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 200),
    [lines, lang, q],
  );
  const pick = (id: string) => {
    setLineId(id);
    setText(lines.find((l) => l.id === id && l.lang === lang)?.text ?? '');
    setTake(null);
  };

  async function loadScript(f: File | undefined) {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text()) as { lines: Line[] };
      setLines(j.lines);
    } catch {
      setErr('script.json?');
    }
  }

  async function start() {
    setErr('');
    setTake(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop());
        const ctx = new AudioContext();
        const buf = await ctx.decodeAudioData(await new Blob(chunks).arrayBuffer());
        void ctx.close();
        const x = normalise(trimSilence(buf.getChannelData(0), buf.sampleRate)); // mono: first channel
        if (x.length === 0) {
          setErr(t.silent);
          return;
        }
        const wav = encodeWav(x, buf.sampleRate);
        setTake({
          wav,
          rate: buf.sampleRate,
          seconds: x.length / buf.sampleRate,
          url: URL.createObjectURL(new Blob([wav.buffer as ArrayBuffer], { type: 'audio/wav' })),
          rms: rmsDb(x),
          peak: peakDb(x),
        });
      };
      rec.start();
      mr.current = rec;
      setRecording(true);
    } catch {
      setErr(t.nomic);
    }
  }
  const stop = () => {
    mr.current?.stop();
    setRecording(false);
  };

  const ready = Boolean(take && lineId && text && talent.trim() && consent && release.trim());
  function add() {
    if (!take || !ready) return;
    setQueue((c) => [
      ...c.filter((x) => !(x.line_id === lineId && x.lang === lang)),
      {
        line_id: lineId,
        lang,
        text,
        speaker: talent.trim(),
        consent: { talent_name: talent.trim(), consented: true, release_text: release, consented_at: new Date().toISOString() },
        audio: { mime: 'audio/wav', rate: take.rate, duration_s: Math.round(take.seconds * 100) / 100, base64: toBase64(take.wav) },
      },
    ]);
    setTake(null);
  }
  function download() {
    const out: VoiceExport = { schema: 1, exported_at: new Date().toISOString(), clips: queue };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
    a.download = `voice-export-${out.exported_at.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageTitle title={t.title} sub={t.sub} />
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              {t.script}
              <input type="file" accept="application/json" onChange={(e) => void loadScript(e.target.files?.[0])} />
            </label>
            <Select
              label={t.lang}
              value={lang}
              onChange={(e) => {
                setLang(e.target.value as 'fr-CA' | 'en-CA');
                setLineId('');
                setText('');
              }}
            >
              <option value="fr-CA">fr-CA</option>
              <option value="en-CA">en-CA</option>
            </Select>
            <Input label={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select label={t.line} value={lineId} onChange={(e) => pick(e.target.value)} className="mt-3">
            <option value="">-</option>
            {shown.map((l) => (
              <option key={l.id} value={l.id}>{`${l.id}  ${l.text.slice(0, 70)}`}</option>
            ))}
          </Select>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label={t.manualId} value={lineId} onChange={(e) => setLineId(e.target.value)} />
            <Input label={t.manualText} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          {text && (
            <p className="mt-4 font-display text-2xl" lang={lang}>
              {text}
            </p>
          )}
          {current?.direction && <p className="text-sm text-muted">{current.direction}</p>}
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-3">
            {recording ? (
              <Button variant="danger" onClick={stop}>
                {t.stop}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => void start()} disabled={!text}>
                {take ? t.again : t.rec}
              </Button>
            )}
            {recording && <Badge tone="bad">REC</Badge>}
          </div>
          {err && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {err}
            </p>
          )}
          {take && (
            <div className="mt-3 flex flex-col gap-2">
              <audio controls src={take.url} aria-label={t.preview} />
              <p className="text-sm text-muted">{t.stats.replace('{s}', take.seconds.toFixed(2)).replace('{r}', take.rms.toFixed(1)).replace('{p}', take.peak.toFixed(1))}</p>
            </div>
          )}
        </Card>

        <Card>
          <Input label={t.talent} value={talent} onChange={(e) => setTalent(e.target.value)} />
          <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
            {t.release}
            <textarea className="min-h-24 rounded-xl border border-line bg-elevated p-2 font-normal" value={release} onChange={(e) => setRelease(e.target.value)} />
          </label>
          <div className="mt-3">
            <Switch checked={consent} onChange={setConsent} label={t.consent} />
          </div>
          <Button variant="primary" className="mt-3" disabled={!ready} onClick={add}>
            {t.add}
          </Button>
        </Card>

        <Card
          title={`${t.queue}: ${queue.length}`}
          action={
            <Button onClick={download} disabled={queue.length === 0}>
              {t.export}
            </Button>
          }
        >
          <ul className="text-sm">
            {queue.map((c) => (
              <li key={c.line_id + c.lang}>{`${c.line_id} (${c.lang}) ${c.audio.duration_s} s, ${c.speaker}`}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">{t.note}</p>
        </Card>
      </div>
    </>
  );
}
