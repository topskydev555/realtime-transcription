let systemStream = null;
let peerConnection = null;
let dataChannel = null;
let isRecording = false;
let transcript = [];
let currentText = '';
let lastUpdateTime = null;
let processedEventIds = new Set();
let lastProcessedText = '';

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const messageArea = document.getElementById('messageArea');
const transcriptContent = document.getElementById('transcriptContent');

function showMessage(text, isError = false) {
  messageArea.innerHTML = `<div class="${isError ? 'error-message' : 'success-message'}">${text}</div>`;
  setTimeout(() => {
    messageArea.innerHTML = '';
  }, 5000);
}

// Utility functions are imported from utils.js

function addTranscriptItem(text) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return;

  if (normalizedText === lastProcessedText) {
    return;
  }

  const now = Date.now();
  const timeSinceLastUpdate = lastUpdateTime ? now - lastUpdateTime : 0;
  lastUpdateTime = now;

  if (timeSinceLastUpdate > 4000 || currentText.length === 0) {
    if (currentText) {
      transcript.push({
        text: normalizeText(currentText),
        timestamp: new Date().toLocaleTimeString()
      });
    }
    currentText = normalizedText;
    lastProcessedText = normalizedText;
  } else {
    const merged = mergeText(currentText, normalizedText);
    if (merged !== currentText) {
      currentText = merged;
      lastProcessedText = normalizedText;
    } else {
      return;
    }
  }

  updateTranscriptDisplay();
}

function updateTranscriptDisplay() {
  if (transcript.length === 0 && !currentText) {
    transcriptContent.innerHTML = '<div class="caption-placeholder">Start recording to see live captions...</div>';
    return;
  }

  let fullText = '';
  
  transcript.forEach(item => {
    fullText += item.text + ' ';
  });

  if (currentText) {
    fullText += currentText;
  }

  const html = `<div class="caption-text">${fullText.trim()}<span class="live-indicator"></span></div>`;
  transcriptContent.innerHTML = html;
  transcriptContent.scrollTop = transcriptContent.scrollHeight;
}

function handleRealtimeEvent(event) {
  try {
    const data = typeof event === 'string' ? JSON.parse(event) : event;
    
    const eventId = data.event_id || `${data.type}-${data.item?.id || data.response?.id || Date.now()}-${Math.random()}`;
    if (processedEventIds.has(eventId)) {
      return;
    }
    
    let textToAdd = null;
    let isDelta = false;
    
    if (data.type === 'response.text.delta') {
      textToAdd = data.delta || '';
      isDelta = true;
    } else if (data.type === 'response.content_part.added' && data.part?.type === 'text') {
      textToAdd = data.part.text || '';
      isDelta = true;
    } else if (data.type === 'response.text.done') {
      textToAdd = data.text || '';
      isDelta = false;
      processedEventIds.add(eventId);
    } else if (data.type === 'response.content_part.done' && data.part?.type === 'text') {
      textToAdd = data.part.text || '';
      isDelta = false;
      processedEventIds.add(eventId);
    } else if (data.type === 'response.output_item.done' && data.item?.type === 'message') {
      if (data.item?.content) {
        textToAdd = Array.isArray(data.item.content) 
          ? data.item.content.map(c => c.text || c.transcript || '').join(' ')
          : data.item.content;
        isDelta = false;
        processedEventIds.add(eventId);
      }
    } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
      textToAdd = data.transcript || data.item?.transcript || '';
      isDelta = false;
      processedEventIds.add(eventId);
    } else if (data.type === 'conversation.item.input_audio_transcription.delta') {
      textToAdd = data.delta || data.item?.delta || '';
      isDelta = true;
    } else if (data.type === 'session.updated') {
      return;
    } else if (data.type === 'error') {
      showMessage(`API Error: ${data.error?.message || 'Unknown error'}`, true);
      return;
    }
    
    if (textToAdd && textToAdd.trim()) {
      if (!isEnglishText(textToAdd)) {
        return;
      }
      
      if (isDelta) {
        addTranscriptItem(textToAdd);
      } else {
        if (currentText) {
          transcript.push({
            text: normalizeText(currentText),
            timestamp: new Date().toLocaleTimeString()
          });
          currentText = '';
        }
        addTranscriptItem(textToAdd);
        processedEventIds.add(eventId);
      }
    }
  } catch (error) {
    console.error('Error handling realtime event:', error);
  }
}

async function startRecording() {
  try {
    if (!navigator.mediaDevices) {
      throw new Error('MediaDevices API not available.');
    }

    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC not supported.');
    }

    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    let sourceId = null;
    
    try {
      const sources = await window.electronAPI.getAudioSources();
      if (sources && sources.length > 0) {
        const screenSource = sources.find(s => 
          s.name.toLowerCase().includes('screen') || 
          s.name.toLowerCase().includes('entire') ||
          s.name.toLowerCase().includes('desktop')
        );
        sourceId = screenSource ? screenSource.id : sources[0].id;
      }
    } catch (sourceError) {
      console.warn('Could not get desktop sources:', sourceError);
    }

    if (sourceId) {
      try {
        const constraints = {
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId
            }
          },
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId
            }
          }
        };
        
        systemStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (desktopError) {
        console.warn('Desktop capture failed:', desktopError);
        sourceId = null;
      }
    }

    if (!systemStream && navigator.mediaDevices.getDisplayMedia) {
      try {
        systemStream = await navigator.mediaDevices.getDisplayMedia({ 
          audio: true,
          video: true
        });
      } catch (displayError) {
        if (displayError.name === 'NotAllowedError') {
          throw new Error('Permission denied. Please allow screen/audio sharing.');
        } else if (displayError.name === 'NotFoundError') {
          throw new Error('No audio source found.');
        } else {
          throw new Error(`Failed to access audio: ${displayError.message}`);
        }
      }
    } else if (!systemStream) {
      throw new Error('Audio capture not available.');
    }
    
    if (systemStream.getVideoTracks().length > 0) {
      systemStream.getVideoTracks().forEach(track => track.stop());
    }

    if (systemStream.getAudioTracks().length === 0) {
      systemStream.getTracks().forEach(track => track.stop());
      throw new Error('No audio track available.');
    }

    systemStream.getAudioTracks().forEach(track => {
      peerConnection.addTrack(track, systemStream);
    });

    dataChannel = peerConnection.createDataChannel('events', {
      ordered: true
    });
    
    dataChannel.onmessage = (e) => {
      try {
        handleRealtimeEvent(e.data);
      } catch (err) {
        console.error('Error handling message:', err);
      }
    };
    
    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      showMessage('Data channel error occurred', true);
    };
    
    dataChannel.onopen = () => {
      showMessage('Connected to OpenAI Realtime API', false);
      
      setTimeout(() => {
        try {
          const config = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: 'You are a real-time transcription service. Transcribe all audio input accurately with proper punctuation.',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500
              },
              tools: [],
              tool_choice: 'none',
              temperature: 0.6,
              max_response_output_tokens: 4096
            }
          };
          
          dataChannel.send(JSON.stringify(config));
          
          setTimeout(() => {
            const transcriptionRequest = {
              type: 'response.create',
              response: {
                modalities: ['text'],
                instructions: 'Transcribe the audio input in real-time. Output only the transcribed text without any additional commentary.'
              }
            };
            dataChannel.send(JSON.stringify(transcriptionRequest));
          }, 500);
        } catch (configError) {
          console.error('Error sending configuration:', configError);
        }
      }, 1000);
    };

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      statusText.textContent = `Connection: ${state}`;
      
      if (state === 'connected' || state === 'completed') {
        showMessage('WebRTC connection established', false);
      } else if (state === 'failed' || state === 'disconnected') {
        showMessage('Connection lost.', true);
      }
    };

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false
    });
    
    await peerConnection.setLocalDescription(offer);

    const answerSdp = await window.electronAPI.getRealtimeAnswer(offer.sdp);
    await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    isRecording = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusDot.classList.add('recording');
    statusText.textContent = 'Recording System Audio...';

    showMessage('Recording started. Play your audio file to begin transcription.', false);

  } catch (error) {
    showMessage(`Failed to start recording: ${error.message}`, true);
    console.error('Recording error:', error);
    stopRecording();
  }
}

function stopRecording() {
  isRecording = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusDot.classList.remove('recording');
  statusText.textContent = 'Not Recording';

  if (currentText) {
    transcript.push({
      text: currentText.trim(),
      timestamp: new Date().toLocaleTimeString()
    });
    currentText = '';
    updateTranscriptDisplay();
  }

  if (dataChannel) {
    try {
      dataChannel.close();
    } catch (e) {}
    dataChannel = null;
  }

  if (peerConnection) {
    try {
      peerConnection.close();
    } catch (e) {}
    peerConnection = null;
  }

  if (systemStream) {
    systemStream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (e) {}
    });
    systemStream = null;
  }
}

async function initializeAPIKey() {
  try {
    const keyStatus = await window.electronAPI.checkAPIKey();
    if (keyStatus.hasKey) {
      startBtn.disabled = false;
    } else {
      showMessage('OpenAI API key not found. Please set OPENAI_API_KEY in .env file', true);
      startBtn.disabled = true;
    }
  } catch (error) {
    console.error('Failed to check API key:', error);
    showMessage('Failed to check API key status', true);
    startBtn.disabled = true;
  }
}

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

initializeAPIKey();
