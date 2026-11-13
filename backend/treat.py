"""Blue Yolk instant treatment: steady + grade + clean sound + mood music, for one 10-15 s phone clip.

  python3 treat.py in.mp4 out.mp4 lux           # one clip from the command line
  python3 treat.py --serve 8080                 # tiny HTTP service: POST /treat?mood=lux  (body = the video file)

Needs ffmpeg with libvidstab. Files are deleted as soon as the result is sent.
"""
import json, os, shutil, subprocess, sys, tempfile, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
MAX_SECONDS = 15
MAX_BYTES = 30 * 1024 * 1024
SIZE = (720, 1280)   # quick preview size; the real delivery is edited by hand at full size
PRE = f"scale={SIZE[0]}:{SIZE[1]}:force_original_aspect_ratio=increase,crop={SIZE[0]}:{SIZE[1]}"
MOODS = {  # colour look and music bed per mood
    "none":    dict(sat=1.12, con=1.06, warm=0.00, vig=0.25, music=None),
    "hype":    dict(sat=1.30, con=1.14, warm=0.03, vig=0.35, music="hype.m4a"),
    "classic": dict(sat=0.96, con=1.04, warm=0.10, vig=0.40, music="classic.m4a"),
    "calm":    dict(sat=0.88, con=0.98, warm=0.05, vig=0.20, music="calm.m4a"),
    "lux":     dict(sat=1.05, con=1.12, warm=0.08, vig=0.55, music="lux.m4a"),
}

def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type",
                          "-of", "json", path], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    return float(j["format"].get("duration", 0)), any(s.get("codec_type") == "audio" for s in j.get("streams", []))

def treat(src, dst, mood="none", work=None):
    look = MOODS.get(mood, MOODS["none"])
    own = work is None
    work = work or tempfile.mkdtemp(prefix="by-")
    dur, has_audio = probe(src)
    dur = min(dur, MAX_SECONDS)
    trf = os.path.join(work, "t.trf")
    # pass 1: measure the shake
    run(["ffmpeg", "-y", "-t", str(dur), "-i", src, "-vf", f"{PRE},vidstabdetect=shakiness=7:accuracy=9:stepsize=8:result={trf}", "-f", "null", "-"])
    # pass 2: steady, frame to 9:16, auto levels and white balance, mood grade, vignette
    w, k = look["warm"], look["vig"]
    vf = ",".join([
        PRE,
        f"vidstabtransform=input={trf}:smoothing=24:zoom=4:optzoom=0:interpol=bilinear",
        "unsharp=5:5:0.5",
        "normalize=blackpt=black:whitept=white:smoothing=24:independence=0.5:strength=0.6",
        f"eq=contrast={look['con']}:saturation={look['sat']}",
        f"colorbalance=rm={w}:bm={-w}:rh={w/2}:bh={-w/2}",
        f"vignette=angle={0.2 + k * 0.5:.2f}",
        "format=yuv420p",
    ])
    inputs = ["-t", str(dur), "-i", src]
    music = look["music"] and os.path.join(HERE, "music", look["music"])
    if music: inputs += ["-stream_loop", "-1", "-i", music]
    if has_audio and music:   # clean the voice, duck the music under it
        af = (f"[0:a]highpass=f=90,afftdn=nr=14,loudnorm=I=-16:TP=-1.5:LRA=11,asplit[v][sc];"
              f"[1:a]volume=0.55,afade=t=out:st={max(0, dur - 1.2)}:d=1.2[m];"
              f"[m][sc]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=300[md];"
              f"[v][md]amix=inputs=2:duration=first:normalize=0[a]")
        amap = ["-filter_complex", af, "-map", "0:v", "-map", "[a]"]
    elif music:
        af = f"[1:a]atrim=0:{dur},afade=t=in:d=0.4,afade=t=out:st={max(0, dur - 1.2)}:d=1.2,loudnorm=I=-16:TP=-1.5[a]"
        amap = ["-filter_complex", af, "-map", "0:v", "-map", "[a]"]
    elif has_audio:
        amap = ["-af", "highpass=f=90,afftdn=nr=14,loudnorm=I=-16:TP=-1.5:LRA=11", "-map", "0:v", "-map", "0:a"]
    else:
        amap = ["-map", "0:v", "-an"]
    run(["ffmpeg", "-y", *inputs, "-vf", vf, *amap, "-t", str(dur), "-c:v", "libx264", "-preset", "superfast", "-crf", "22",
         "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", dst])
    if own: shutil.rmtree(work, ignore_errors=True)
    return dst

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "https://blueyolk.org")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200); self.send_header("Content-Length", "2"); self.end_headers(); self.wfile.write(b"ok")
        else:
            self.send_error(404)
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        if not self.path.startswith("/treat"):
            self.send_error(404); return
        n = int(self.headers.get("Content-Length", 0))
        if not n or n > MAX_BYTES:
            self.send_error(413, "clip too large"); return
        mood = (self.path.split("mood=")[1].split("&")[0] if "mood=" in self.path else "none")
        work = tempfile.mkdtemp(prefix="by-")
        try:
            src, dst = os.path.join(work, "in"), os.path.join(work, "out.mp4")
            with open(src, "wb") as f:
                left = n
                while left:
                    chunk = self.rfile.read(min(1 << 20, left)); f.write(chunk); left -= len(chunk)
            t0 = time.time(); treat(src, dst, mood, work)
            data = open(dst, "rb").read()
            self.send_response(200); self._cors()
            self.send_header("Content-Type", "video/mp4"); self.send_header("Content-Length", str(len(data)))
            self.send_header("X-Took", f"{time.time() - t0:.1f}s"); self.end_headers(); self.wfile.write(data)
        except Exception as e:
            self.send_error(500, "could not treat this clip")
        finally:
            shutil.rmtree(work, ignore_errors=True)   # nothing is kept

if __name__ == "__main__":
    if sys.argv[1:2] == ["--serve"]:
        ThreadingHTTPServer(("0.0.0.0", int(sys.argv[2]) if len(sys.argv) > 2 else 8080), H).serve_forever()
    else:
        t0 = time.time(); treat(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "none")
        print(f"done in {time.time() - t0:.1f}s")
