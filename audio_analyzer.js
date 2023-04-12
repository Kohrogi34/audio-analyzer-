const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const volumeCanvas = document.getElementById('volume');
const frequencyCanvas = document.getElementById('frequency');

const volumeCtx = volumeCanvas.getContext('2d');
const frequencyCtx = frequencyCanvas.getContext('2d');

let audioContext = null;
let audioStream = null;
let analyser = null;
let animationId = null;

function drawVolume() {
  const dataArray = new Uint8Array(analyser.fftSize);
  analyser.getByteFrequencyData(dataArray);

  const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;

  volumeCtx.clearRect(0, 0, volumeCanvas.width, volumeCanvas.height);
  volumeCtx.fillStyle = '#00ff00';
  volumeCtx.fillRect(0, 0, volume * 2, volumeCanvas.height);

  animationId = requestAnimationFrame(drawVolume);
}

function drawFrequency() {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  frequencyCtx.clearRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);

  const barWidth = frequencyCanvas.width / analyser.frequencyBinCount;

  for (let i = 0; i < analyser.frequencyBinCount; i++) {
    const value = dataArray[i];
    const percent = value / 256;
    const height = frequencyCanvas.height * percent;
    const offset = frequencyCanvas.height - height;

    frequencyCtx.fillStyle = `hsl(${i / analyser.frequencyBinCount * 360}, 100%, 50%)`;
    frequencyCtx.fillRect(i * barWidth, offset, barWidth, height);
  }

  animationId = requestAnimationFrame(drawFrequency);
}

async function start() {
  if (audioContext) return;

  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console
    console.error('Error:', err);
    return;
  }

  const source = audioContext.createMediaStreamSource(audioStream);
  source.connect(analyser);

  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;

  startBtn.disabled = true;
  stopBtn.disabled = false;

  drawVolume();
  drawFrequency();
}

function stop() {
  if (!audioContext) return;

  audioStream.getTracks().forEach(track => track.stop());
  audioContext.close();

  audioContext = null;
  audioStream = null;
  analyser = null;

  cancelAnimationFrame(animationId);

  startBtn.disabled = false;
  stopBtn.disabled = true;

  volumeCtx.clearRect(0, 0, volumeCanvas.width, volumeCanvas.height);
  frequencyCtx.clearRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);
}

startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);

const recordBtn = document.getElementById('record');
const stopRecordBtn = document.getElementById('stopRecord');
const downloadBtn = document.getElementById('download');
const videoElement = document.getElementById('video');

let mediaRecorder = null;
let recordedChunks = [];

async function startRecording() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always' },
    audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
  });

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    videoElement.src = url;
    downloadBtn.href = url;
    downloadBtn.download = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;

    downloadBtn.disabled = false;
  };

  mediaRecorder.start();
  recordBtn.disabled = true;
  stopRecordBtn.disabled = false;
}

function stopRecording() {
  if (!mediaRecorder) return;

  mediaRecorder.stop();
  mediaRecorder = null;

  recordBtn.disabled = false;
  stopRecordBtn.disabled = true;
}

recordBtn.addEventListener('click', startRecording);
stopRecordBtn.addEventListener('click', stopRecording);
