"""Add SI disclosure to prepared MP3 metadata without changing audio bytes.

Uses only Python's standard library. Re-running leaves already-tagged files
unchanged. The narration authoring script also runs this after generation.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'public/assets/voice'
DESCRIPTION = 'SI generation'
COMMENT = ('SI-generated synthetic narration, prepared offline with Tiny Voca '
           'and Dizione. Rocky: M2; Mission Control: F2. No human voice cloning.')


def unsynchsafe(value):
    if len(value) != 4 or any(n & 0x80 for n in value):
        raise ValueError('Invalid ID3 synchsafe size')
    return sum(n << (7 * (3 - i)) for i, n in enumerate(value))


def synchsafe(value):
    if not 0 <= value < 1 << 28:
        raise ValueError('ID3 tag too large')
    return bytes((value >> shift) & 0x7f for shift in (21, 14, 7, 0))


def audio_payload(data):
    if data[:3] != b'ID3':
        return data
    return data[10 + unsynchsafe(data[6:10]):]


def tag_mp3(path):
    original = path.read_bytes()
    payload = b'\x03eng' + DESCRIPTION.encode() + b'\x00' + COMMENT.encode()
    frame = b'COMM' + synchsafe(len(payload)) + b'\x00\x00' + payload
    frames = []
    if original[:3] == b'ID3':
        if original[3:6] != b'\x04\x00\x00':
            raise ValueError(f'Unsupported ID3 header; left unchanged: {path}')
        size = unsynchsafe(original[6:10])
        tag, pos = original[10:10 + size], 0
        while pos < len(tag) and tag[pos] != 0:
            if pos + 10 > len(tag):
                raise ValueError(f'Truncated ID3 frame: {path}')
            frame_size = unsynchsafe(tag[pos + 4:pos + 8])
            end = pos + 10 + frame_size
            if end > len(tag):
                raise ValueError(f'Truncated ID3 frame: {path}')
            current = tag[pos:end]
            # Replace only this script's comment; preserve every other frame.
            ours = current[:4] == b'COMM' and current[10:].startswith(b'\x03eng' + DESCRIPTION.encode() + b'\x00')
            if not ours:
                frames.append(current)
            pos = end
    tag = b''.join(frames) + frame
    updated = b'ID3\x04\x00\x00' + synchsafe(len(tag)) + tag + audio_payload(original)
    if audio_payload(updated) != audio_payload(original):
        raise ValueError(f'Audio payload changed; not writing: {path}')
    if updated != original:
        path.write_bytes(updated)
        return True
    return False


def main():
    manifest_path = ROOT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    files = sorted((ROOT / 'clips').glob('*.mp3'))
    changed = sum(tag_mp3(path) for path in files)
    manifest['si_generation'] = {
        'generated': True,
        'description': COMMENT,
        'tools': ['Tiny Voca', 'Dizione'],
        'disclosure': 'NOTICE.txt',
    }
    for entry in manifest['clips'].values():
        path = ROOT / entry['file']
        entry['si_generated'] = True
        entry['bytes'] = path.stat().st_size
        entry['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    serialized = json.dumps(manifest, indent=2) + '\n'
    if manifest_path.read_text() != serialized:
        manifest_path.write_text(serialized)
    print(json.dumps({'clips': len(files), 'metadata_updated': changed,
                      'audio_payload': 'unchanged',
                      'total_bytes': sum(path.stat().st_size for path in files)}))


if __name__ == '__main__':
    main()
