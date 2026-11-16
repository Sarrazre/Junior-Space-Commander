"""Apply small deterministic SI disclosures; no generative service is called.

Run from any directory with Python/Pillow and ffmpeg installed. Original media
is backed up outside the served public directory before first modification.
Already labelled media is skipped, so repeated runs do not recompress it.
"""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import tempfile

from PIL import Image, ImageChops, ImageDraw, ImageFont, PngImagePlugin


ROOT = Path(__file__).resolve().parents[1]
BACKUP = Path(os.environ.get("JSC_SI_ORIGINALS", "/private/tmp/jsc-si-originals"))
LABEL = "SI-generated"
WATERMARK_VERSION = "plain-v2"
VERSION_NOTICE = f"SI watermark version: {WATERMARK_VERSION}."
ART_NOTICE = "SI-generated fictional game artwork; OpenAI image generation. Not NASA imagery."
TEAM_ART_NOTICE = "SI-generated fictional game artwork; team-confirmed AI origin; original generation tool not recorded. Not NASA imagery."
VIDEO_NOTICE = "SI-generated fictional intro video; Kling. Not NASA imagery."
TEAM_STILLS = ["assets/base.webp", "assets/landing-bg.webp", "assets/mission-logo.webp"]
STILLS = [
    "assets/visual/base-night.jpg",
    "assets/visual/base-wilted.jpg",
    "assets/visual/base-night-wilted.jpg",
    "assets/visual/tomato-healthy.png",
    "assets/visual/tomato-wilted.png",
    "assets/visual/tomato-spoiled.png",
    "assets/greenhouse/lettuce-pod.png",
    "assets/greenhouse/lettuce-wilted.png",
] + TEAM_STILLS


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def backup(path):
    target = BACKUP / path.relative_to(ROOT / "public")
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copy2(path, target)
    return target


def font(size):
    for name in [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default(size=size)


def badge(size):
    """Return plain small white text, with a thin contrast stroke, at bottom-right."""
    width, height = size
    fontsize = max(12, round(min(width, height) * 0.014))
    margin = max(6, round(min(width, height) * 0.012))
    padding = 4
    face = font(fontsize)
    bounds = face.getbbox(LABEL, stroke_width=1)
    label_width, label_height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    mark = Image.new("RGBA", (label_width + padding * 2, label_height + padding * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mark)
    draw.text((padding - bounds[0], padding - bounds[1]), LABEL, font=face, fill="white", stroke_width=1, stroke_fill=(10, 22, 39, 220))
    return mark, (width - margin - mark.width, height - margin - mark.height)


def label_still(relative):
    path = ROOT / "public" / relative
    current = Image.open(path)
    notice = TEAM_ART_NOTICE if relative in TEAM_STILLS else ART_NOTICE
    description = str(current.info.get("Description", "") or current.getexif().get(270, ""))
    if notice in description and VERSION_NOTICE in description:
        return {"path": relative, "status": "already labelled"}
    if notice in description and not (BACKUP / relative).exists():
        raise ValueError(f"Original backup required to replace an older watermark: {relative}")
    prior = backup(path)
    # Always re-render a changed style from the unlabelled original. This
    # removes old labels without doubling them or recompressing an edit.
    original = Image.open(prior)
    labelled_notice = notice + " " + VERSION_NOTICE
    source_alpha = original.getchannel("A").tobytes() if original.mode == "RGBA" else None
    rgba = original.convert("RGBA")
    mark, point = badge(rgba.size)
    rgba.alpha_composite(mark, point)
    rectangle = [*point, point[0] + mark.width, point[1] + mark.height]
    temporary = path.with_name(path.stem + ".si-tmp" + path.suffix)
    if path.suffix == ".png":
        metadata = PngImagePlugin.PngInfo()
        for key, value in original.info.items():
            if isinstance(value, str):
                metadata.add_text(key, value)
        metadata.add_text("Description", labelled_notice)
        metadata.add_text("SI_generated", "true")
        metadata.add_text("SI_watermark_version", WATERMARK_VERSION)
        metadata.add_text("Generation_tool", "OpenAI image generation")
        rgba.save(temporary, pnginfo=metadata, optimize=True)
    elif path.suffix == ".webp":
        exif = original.getexif()
        exif[270] = labelled_notice
        # WebP keeps alpha lossless even when its colour plane is compressed.
        # Keep the source profile and mode as well as its original dimensions.
        webp = rgba if original.mode == "RGBA" else rgba.convert(original.mode)
        options = {"quality": 94, "method": 6, "exif": exif}
        if original.info.get("icc_profile"):
            options["icc_profile"] = original.info["icc_profile"]
        webp.save(temporary, **options)
    else:
        exif = original.getexif()
        exif[270] = labelled_notice
        rgba.convert("RGB").save(temporary, quality=94, subsampling=0, exif=exif)
    check = Image.open(temporary)
    assert check.size == original.size
    assert check.mode == original.mode
    if source_alpha is not None:
        # Only the new badge rectangle may change transparency; retain every
        # transparent cutout pixel elsewhere (never flatten the sprite).
        alpha = Image.frombytes("L", original.size, source_alpha)
        new_alpha = check.getchannel("A")
        difference = ImageChops.difference(alpha, new_alpha)
        difference.paste(0, rectangle)
        assert difference.getbbox() is None
    temporary.replace(path)
    return {"path": relative, "status": "labelled", "watermark_version": WATERMARK_VERSION, "size": list(check.size), "mode": check.mode,
            "watermark_rectangle": rectangle, "before_bytes": prior.stat().st_size,
            "after_bytes": path.stat().st_size, "original_sha256": digest(prior), "sha256": digest(path)}


def probe(path):
    return json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)]))


def audio_hash(path):
    return subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-c:a", "copy", "-f", "hash", "-hash", "sha256", "-"]).decode().strip()


def label_video():
    path = ROOT / "public/assets/intro.mp4"
    current = probe(path)
    current_tags = current["format"].get("tags", {})
    if current_tags.get("comment") == VIDEO_NOTICE and current_tags.get("SI_watermark_version") == WATERMARK_VERSION:
        return {"path": "assets/intro.mp4", "status": "already labelled"}
    if current_tags.get("comment") == VIDEO_NOTICE and not (BACKUP / "assets/intro.mp4").exists():
        raise ValueError("Original backup required to replace an older video watermark")
    prior = backup(path)
    before = probe(prior)
    video = next(stream for stream in before["streams"] if stream["codec_type"] == "video")
    mark, point = badge((video["width"], video["height"]))
    with tempfile.TemporaryDirectory(prefix="jsc-si-label-") as directory:
        watermark = Path(directory) / "si-generated.png"
        mark.save(watermark)
        temporary = path.with_name("intro.si-tmp.mp4")
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(prior), "-i", str(watermark),
            "-filter_complex", f"[0:v:0][1:v:0]overlay={point[0]}:{point[1]}:format=auto[v]",
            "-map", "[v]", "-map", "0:a?", "-map_metadata", "0", "-c:v", "libx264",
            "-preset", "medium", "-crf", "18", "-threads", "4", "-pix_fmt", "yuv420p", "-c:a", "copy",
            "-metadata", f"comment={VIDEO_NOTICE}", "-metadata", "SI_generated=true",
            "-metadata", f"SI_watermark_version={WATERMARK_VERSION}",
            "-movflags", "+faststart+use_metadata_tags", str(temporary),
        ], check=True)
        after = probe(temporary)
        output_video = next(stream for stream in after["streams"] if stream["codec_type"] == "video")
        assert (output_video["width"], output_video["height"]) == (video["width"], video["height"])
        assert output_video["nb_frames"] == video["nb_frames"]
        assert abs(float(before["format"]["duration"]) - float(after["format"]["duration"])) < 0.001
        assert after["format"]["tags"]["AIGC"] == before["format"]["tags"]["AIGC"]
        original_audio_hash = audio_hash(prior)
        assert original_audio_hash == audio_hash(temporary)
        temporary.replace(path)
    return {"path": "assets/intro.mp4", "status": "labelled", "watermark_version": WATERMARK_VERSION, "size": [video["width"], video["height"]],
            "duration": after["format"]["duration"], "frames": output_video["nb_frames"],
            "watermark_rectangle": [*point, point[0] + mark.width, point[1] + mark.height],
            "before_bytes": prior.stat().st_size, "after_bytes": path.stat().st_size,
            "original_sha256": digest(prior), "sha256": digest(path), "audio_packet_hash": original_audio_hash,
            "original_aigc_metadata_retained": True}


if __name__ == "__main__":
    results = [label_still(path) for path in STILLS]
    results.append(label_video())
    report = {"backup_directory": str(BACKUP), "results": results}
    BACKUP.mkdir(parents=True, exist_ok=True)
    report_path = BACKUP / "label-report.json"
    if report_path.exists():
        previous = {item["path"]: item for item in json.loads(report_path.read_text())["results"]}
        report["results"] = [previous.get(item["path"], item) if item["status"] == "already labelled" else item for item in results]
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
